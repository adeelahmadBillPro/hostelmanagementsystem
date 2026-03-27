import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { generateBillForResident } from "@/lib/billing";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = rateLimit(request, "sensitive");
  if (limited) return limited;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Your account is not linked to any organization. Please contact support." }, { status: 403 });
    }

    // Verify hostel ownership
    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body;

    // ===== BULK MARK PAID =====
    if (action === "bulk-mark-paid") {
      const { billIds, method } = body;
      if (!billIds || !Array.isArray(billIds) || billIds.length === 0) {
        return NextResponse.json({ error: "billIds array is required" }, { status: 400 });
      }
      const paymentMethod = method || "CASH";

      const bills = await prisma.monthlyBill.findMany({
        where: {
          id: { in: billIds },
          hostelId: params.id,
          status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
        },
      });

      if (bills.length === 0) {
        return NextResponse.json({ error: "No eligible bills found" }, { status: 404 });
      }

      let paidCount = 0;
      for (const bill of bills) {
        const balance = bill.balance;
        if (balance <= 0) continue;

        await prisma.payment.create({
          data: {
            amount: balance,
            method: paymentMethod,
            residentId: bill.residentId,
            billId: bill.id,
            hostelId: params.id,
            recordedById: session.user.id,
          },
        });

        await prisma.monthlyBill.update({
          where: { id: bill.id },
          data: {
            paidAmount: bill.totalAmount,
            balance: 0,
            status: "PAID",
          },
        });

        paidCount++;
      }

      return NextResponse.json({
        success: true,
        message: `${paidCount} bills marked as paid`,
        count: paidCount,
      });
    }

    // ===== BULK NOTIFY =====
    if (action === "bulk-notify") {
      const { residentIds, message } = body;
      if (!message || typeof message !== "string") {
        return NextResponse.json({ error: "message is required" }, { status: 400 });
      }

      // If residentIds not provided, notify all active residents
      let targetCount = 0;

      const notice = await prisma.notice.create({
        data: {
          title: "Bulk Notification",
          content: message,
          hostelId: params.id,
          createdById: session.user.id,
        },
      });

      if (residentIds && Array.isArray(residentIds) && residentIds.length > 0) {
        targetCount = residentIds.length;
      } else {
        const activeResidents = await prisma.resident.count({
          where: { hostelId: params.id, status: "ACTIVE" },
        });
        targetCount = activeResidents;
      }

      return NextResponse.json({
        success: true,
        message: `Notice sent to ${targetCount} residents`,
        count: targetCount,
        noticeId: notice.id,
      });
    }

    // ===== BULK CHECKOUT =====
    if (action === "bulk-checkout") {
      const { residentIds } = body;
      if (!residentIds || !Array.isArray(residentIds) || residentIds.length === 0) {
        return NextResponse.json({ error: "residentIds array is required" }, { status: 400 });
      }

      const residents = await prisma.resident.findMany({
        where: {
          id: { in: residentIds },
          hostelId: params.id,
          status: "ACTIVE",
        },
      });

      if (residents.length === 0) {
        return NextResponse.json({ error: "No active residents found" }, { status: 404 });
      }

      let checkoutCount = 0;
      for (const resident of residents) {
        await prisma.resident.update({
          where: { id: resident.id },
          data: {
            status: "CHECKED_OUT",
            moveOutDate: new Date(),
          },
        });

        await prisma.bed.update({
          where: { id: resident.bedId },
          data: { status: "VACANT" },
        });

        checkoutCount++;
      }

      return NextResponse.json({
        success: true,
        message: `${checkoutCount} residents checked out`,
        count: checkoutCount,
      });
    }

    // ===== BULK GENERATE BILLS =====
    if (action === "bulk-generate-bills") {
      const { month, year } = body;
      if (!month || !year) {
        return NextResponse.json({ error: "month and year are required" }, { status: 400 });
      }

      const hostelId = params.id;
      const bills = await prisma.$transaction(async (tx) => {
        const residents = await tx.resident.findMany({ where: { hostelId, status: "ACTIVE" } });
        const results = [];
        for (const r of residents) {
          const bill = await generateBillForResident(r.id, month, year, hostelId, tx);
          if (bill) results.push(bill);
        }
        return results;
      });

      return NextResponse.json({
        success: true,
        message: `${bills.length} bills generated for ${month}/${year}`,
        count: bills.length,
      });
    }

    // ===== BULK ASSIGN =====
    if (action === "bulk-assign") {
      const { assignments } = body;
      if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
        return NextResponse.json({ error: "assignments array is required" }, { status: 400 });
      }

      let assignedCount = 0;
      const assignFailed: { residentId: string; error: string }[] = [];

      for (const assignment of assignments) {
        try {
          const { residentId, roomId, bedId } = assignment;

          if (!residentId || !roomId || !bedId) {
            assignFailed.push({ residentId: residentId || "unknown", error: "Missing residentId, roomId, or bedId" });
            continue;
          }

          // Verify resident belongs to this hostel
          const resident = await prisma.resident.findFirst({
            where: { id: residentId, hostelId: params.id },
          });
          if (!resident) {
            assignFailed.push({ residentId, error: "Resident not found in this hostel" });
            continue;
          }

          // Verify bed is VACANT
          const bed = await prisma.bed.findFirst({
            where: { id: bedId, roomId, status: "VACANT" },
          });
          if (!bed) {
            assignFailed.push({ residentId, error: "Bed not available or not found" });
            continue;
          }

          // If resident currently has a bed, free it
          if (resident.bedId) {
            await prisma.bed.update({
              where: { id: resident.bedId },
              data: { status: "VACANT" },
            });
          }

          // Assign resident to new room and bed
          await prisma.resident.update({
            where: { id: residentId },
            data: { roomId, bedId },
          });

          await prisma.bed.update({
            where: { id: bedId },
            data: { status: "OCCUPIED" },
          });

          assignedCount++;
        } catch (err: any) {
          assignFailed.push({ residentId: assignment.residentId || "unknown", error: err.message || "Unknown error" });
        }
      }

      return NextResponse.json({
        success: true,
        message: `${assignedCount} residents assigned`,
        count: assignedCount,
        failed: assignFailed,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Bulk operation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
