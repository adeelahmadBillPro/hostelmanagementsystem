import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

      const activeResidents = await prisma.resident.findMany({
        where: { hostelId: params.id, status: "ACTIVE" },
        include: {
          room: true,
          bed: true,
          parking: true,
          foodOrders: {
            where: {
              orderDate: {
                gte: new Date(year, month - 1, 1),
                lte: new Date(year, month, 0, 23, 59, 59),
              },
            },
          },
        },
      });

      let generatedCount = 0;
      for (const resident of activeResidents) {
        // Check if bill already exists
        const existingBill = await prisma.monthlyBill.findUnique({
          where: {
            residentId_month_year: {
              residentId: resident.id,
              month,
              year,
            },
          },
        });

        if (existingBill) continue;

        const roomRent = resident.room.rentPerBed;
        const foodCharges = resident.foodOrders.reduce(
          (sum: number, o: any) => sum + o.totalAmount,
          0
        );
        const parkingFee = resident.parking.reduce(
          (sum: number, p: any) => sum + p.monthlyFee,
          0
        );

        // Check previous balance
        const lastBill = await prisma.monthlyBill.findFirst({
          where: {
            residentId: resident.id,
            OR: [
              { month: month === 1 ? 12 : month - 1, year: month === 1 ? year - 1 : year },
            ],
          },
          orderBy: { createdAt: "desc" },
        });

        const previousBalance = lastBill ? lastBill.balance : 0;
        const totalAmount = roomRent + foodCharges + parkingFee + previousBalance;

        await prisma.monthlyBill.create({
          data: {
            month,
            year,
            roomRent,
            foodCharges,
            parkingFee,
            previousBalance,
            totalAmount,
            balance: totalAmount,
            residentId: resident.id,
            hostelId: params.id,
            dueDate: new Date(year, month - 1, 10),
          },
        });

        generatedCount++;
      }

      return NextResponse.json({
        success: true,
        message: `${generatedCount} bills generated for ${month}/${year}`,
        count: generatedCount,
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
