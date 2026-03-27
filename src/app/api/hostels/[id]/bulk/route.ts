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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Bulk operation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
