import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { markOverdueBills } from "@/lib/billing";

// Helper: get week number of the year
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Helper: get week date range
function getWeekRange(year: number, week: number): { start: Date; end: Date } {
  const jan1 = new Date(year, 0, 1);
  const daysOffset = (week - 1) * 7 - jan1.getDay() + 1;
  const start = new Date(year, 0, 1 + daysOffset);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Your account is not linked to any organization." }, { status: 403 });
    }

    const hostelId = params.id;
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    await markOverdueBills(hostelId, prisma);

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const week = searchParams.get("week") ? parseInt(searchParams.get("week")!) : null;

    const where: any = { hostelId, month, year };
    if (week) where.weekNumber = week;

    const bills = await prisma.monthlyBill.findMany({
      where,
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
      hostelSettings: {
        billingCycle: (hostel as any).billingCycle || "MONTHLY",
        fixedFoodCharge: (hostel as any).fixedFoodCharge || 0,
        billingDueDays: (hostel as any).billingDueDays || 7,
      },
      stats: { totalBilled, totalCollected, totalPending, totalOverdue },
    });
  } catch (error) {
    console.error("Get bills error:", error);
    return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = rateLimit(request, "sensitive");
  if (limited) return limited;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Your account is not linked to any organization." }, { status: 403 });
  }

  try {
    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const body = await request.json();
    const { month, year, cycle, selectedResidentIds } = body;
    const billingCycle = cycle || (hostel as any).billingCycle || "MONTHLY";

    if (!month || !year) {
      return NextResponse.json({ error: "Month and year are required" }, { status: 400 });
    }

    // Determine billing period
    let periodStart: Date;
    let periodEnd: Date;
    let weekNumber: number | null = null;
    let rentMultiplier = 1; // For prorating monthly rent to weekly

    if (billingCycle === "WEEKLY") {
      weekNumber = body.weekNumber || getWeekNumber(new Date());
      const range = getWeekRange(year, weekNumber!);
      periodStart = range.start;
      periodEnd = range.end;
      rentMultiplier = 7 / 30; // ~23% of monthly rent
    } else if (billingCycle === "BIWEEKLY") {
      weekNumber = body.weekNumber || getWeekNumber(new Date());
      const range = getWeekRange(year, weekNumber!);
      periodStart = range.start;
      periodEnd = new Date(range.start);
      periodEnd.setDate(periodEnd.getDate() + 13);
      periodEnd.setHours(23, 59, 59, 999);
      rentMultiplier = 14 / 30; // ~47% of monthly rent
    } else {
      periodStart = new Date(year, month - 1, 1);
      periodEnd = new Date(year, month, 0, 23, 59, 59);
    }

    // Get residents
    const residentWhere: any = { hostelId: params.id, status: "ACTIVE" };
    if (selectedResidentIds && selectedResidentIds.length > 0) {
      residentWhere.id = { in: selectedResidentIds };
    }

    const residents = await prisma.resident.findMany({
      where: residentWhere,
      include: {
        room: { select: { rentPerBed: true } },
        bed: true,
        parking: true,
      },
    });

    // Get existing bills for this period
    const existingWhere: any = { hostelId: params.id, month, year };
    if (weekNumber) existingWhere.weekNumber = weekNumber;

    const existingBills = await prisma.monthlyBill.findMany({
      where: existingWhere,
      select: { residentId: true },
    });
    const existingResidentIds = new Set(existingBills.map((b) => b.residentId));
    const newResidents = residents.filter((r) => !existingResidentIds.has(r.id));

    if (newResidents.length === 0) {
      return NextResponse.json({
        message: "Bills already generated for all residents in this period",
        count: 0,
      });
    }

    // Calculate bills
    const fixedFoodCharge = ((hostel as any).fixedFoodCharge || 0) * rentMultiplier;
    const dueDays = (hostel as any).billingDueDays || 7;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    // Previous period for balance carry-forward
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const billsToCreate = [];

    for (const resident of newResidents) {
      const roomRent = Math.round(resident.room.rentPerBed * rentMultiplier);

      // Food order charges for this period
      const foodOrders = await prisma.foodOrder.findMany({
        where: {
          residentId: resident.id,
          hostelId: params.id,
          orderDate: { gte: periodStart, lte: periodEnd },
        },
      });
      const foodCharges = foodOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      // Parking fee (prorated)
      const parkingFee = Math.round(
        resident.parking.reduce((sum, p) => sum + p.monthlyFee, 0) * rentMultiplier
      );

      // Meter charges
      const meterReadings = await prisma.meterReading.findMany({
        where: {
          roomId: resident.roomId,
          hostelId: params.id,
          readingDate: { gte: periodStart, lte: periodEnd },
        },
      });
      const meterCharges = meterReadings.reduce((sum, m) => sum + m.amount, 0);

      // Previous balance (only for monthly or first week of month)
      let previousBalance = 0;
      if (billingCycle === "MONTHLY" || (weekNumber && weekNumber <= 5)) {
        const lastBill = await prisma.monthlyBill.findFirst({
          where: { residentId: resident.id, hostelId: params.id },
          orderBy: { createdAt: "desc" },
          select: { balance: true, id: true },
        });
        if (lastBill) {
          previousBalance = lastBill.balance;
        }
      }

      // Advance deduction (first bill only)
      let advanceDeduction = 0;
      const anyPreviousBill = await prisma.monthlyBill.count({
        where: { residentId: resident.id },
      });
      if (anyPreviousBill === 0 && resident.advancePaid > 0) {
        advanceDeduction = resident.advancePaid;
      }

      const totalAmount = roomRent + foodCharges + fixedFoodCharge + parkingFee +
        meterCharges + previousBalance - advanceDeduction;

      billsToCreate.push({
        residentId: resident.id,
        hostelId: params.id,
        month,
        year,
        weekNumber,
        periodStart,
        periodEnd,
        billingCycle,
        roomRent,
        foodCharges,
        fixedFoodFee: fixedFoodCharge,
        otherCharges: 0,
        meterCharges,
        parkingFee,
        previousBalance,
        advanceDeduction,
        totalAmount: Math.max(0, totalAmount),
        paidAmount: 0,
        balance: Math.max(0, totalAmount),
        status: "UNPAID" as const,
        dueDate,
      });
    }

    const created = await prisma.monthlyBill.createMany({ data: billsToCreate });

    return NextResponse.json({
      message: `Generated ${created.count} bills for ${billingCycle.toLowerCase()} period`,
      count: created.count,
    });
  } catch (error) {
    console.error("Generate bills error:", error);
    return NextResponse.json({ error: "Failed to generate bills" }, { status: 500 });
  }
}
