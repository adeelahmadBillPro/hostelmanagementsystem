import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
  }

  try {
    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const bills = await prisma.monthlyBill.findMany({
      where: {
        hostelId: params.id,
        month,
        year,
      },
      include: {
        resident: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
            room: { select: { roomNumber: true } },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const totalBilled = bills.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalCollected = bills.reduce((sum, b) => sum + b.paidAmount, 0);
    const totalPending = bills
      .filter((b) => b.status === "UNPAID" || b.status === "PARTIAL")
      .reduce((sum, b) => sum + b.balance, 0);
    const totalOverdue = bills
      .filter((b) => b.status === "OVERDUE")
      .reduce((sum, b) => sum + b.balance, 0);

    return NextResponse.json({
      bills,
      stats: {
        totalBilled,
        totalCollected,
        totalPending,
        totalOverdue,
      },
    });
  } catch (error) {
    console.error("Get bills error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
  }

  try {
    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const body = await request.json();
    const { month, year } = body;

    if (!month || !year) {
      return NextResponse.json(
        { error: "Month and year are required" },
        { status: 400 }
      );
    }

    // Get all active residents for this hostel
    const residents = await prisma.resident.findMany({
      where: {
        hostelId: params.id,
        status: "ACTIVE",
      },
      include: {
        room: { select: { rentPerBed: true } },
        bed: true,
        parking: true,
      },
    });

    // Get existing bills for this month to skip duplicates
    const existingBills = await prisma.monthlyBill.findMany({
      where: {
        hostelId: params.id,
        month,
        year,
      },
      select: { residentId: true },
    });
    const existingResidentIds = new Set(existingBills.map((b) => b.residentId));

    const newResidents = residents.filter((r) => !existingResidentIds.has(r.id));

    if (newResidents.length === 0) {
      return NextResponse.json({
        message: "Bills already generated for all active residents",
        count: 0,
      });
    }

    // Calculate previous month
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const billsToCreate = [];

    for (const resident of newResidents) {
      // Room rent from bed/room
      const roomRent = resident.room.rentPerBed;

      // Food charges: sum of food orders for this month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const foodOrders = await prisma.foodOrder.findMany({
        where: {
          residentId: resident.id,
          hostelId: params.id,
          orderDate: { gte: startDate, lte: endDate },
        },
      });
      const foodCharges = foodOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      // Parking fee
      const parkingFee = resident.parking.reduce(
        (sum, p) => sum + p.monthlyFee,
        0
      );

      // Meter charges (from meter readings for this month)
      let meterCharges = 0;
      const meterReadings = await prisma.meterReading.findMany({
        where: {
          roomId: resident.roomId,
          hostelId: params.id,
          readingDate: { gte: startDate, lte: endDate },
        },
      });
      meterCharges = meterReadings.reduce(
        (sum, m) => sum + m.amount,
        0
      );

      // Previous balance from last month's bill
      let previousBalance = 0;
      const lastBill = await prisma.monthlyBill.findFirst({
        where: {
          residentId: resident.id,
          month: prevMonth,
          year: prevYear,
        },
      });
      if (lastBill) {
        previousBalance = lastBill.balance;
      }

      // Advance deduction (first month only, if advance exists and no previous bills)
      let advanceDeduction = 0;
      if (!lastBill && resident.advancePaid > 0) {
        advanceDeduction = resident.advancePaid;
      }

      const otherCharges = 0;
      const totalAmount =
        roomRent +
        foodCharges +
        otherCharges +
        meterCharges +
        parkingFee +
        previousBalance -
        advanceDeduction;

      billsToCreate.push({
        residentId: resident.id,
        hostelId: params.id,
        month,
        year,
        roomRent,
        foodCharges,
        otherCharges,
        meterCharges,
        parkingFee,
        previousBalance,
        advanceDeduction,
        totalAmount: Math.max(0, totalAmount),
        paidAmount: 0,
        balance: Math.max(0, totalAmount),
        status: "UNPAID" as const,
      });
    }

    const created = await prisma.monthlyBill.createMany({
      data: billsToCreate,
    });

    return NextResponse.json({
      message: `Generated ${created.count} bills successfully`,
      count: created.count,
    });
  } catch (error) {
    console.error("Generate bills error:", error);
    return NextResponse.json(
      { error: "Failed to generate bills" },
      { status: 500 }
    );
  }
}
