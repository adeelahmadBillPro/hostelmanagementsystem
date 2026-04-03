import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { markOverdueBills } from "@/lib/billing";
import { validateMonthYear } from "@/lib/validate";

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
        breakfastStart: (hostel as any).breakfastStart ?? 6,
        breakfastEnd: (hostel as any).breakfastEnd ?? 9,
        lunchStart: (hostel as any).lunchStart ?? 11,
        lunchEnd: (hostel as any).lunchEnd ?? 14,
        dinnerStart: (hostel as any).dinnerStart ?? 18,
        dinnerEnd: (hostel as any).dinnerEnd ?? 21,
        snackStart: (hostel as any).snackStart ?? 10,
        snackEnd: (hostel as any).snackEnd ?? 22,
        // Payment methods
        jazzCashNumber: (hostel as any).jazzCashNumber || "",
        jazzCashTitle: (hostel as any).jazzCashTitle || "",
        easyPaisaNumber: (hostel as any).easyPaisaNumber || "",
        easyPaisaTitle: (hostel as any).easyPaisaTitle || "",
        bankName: (hostel as any).bankName || "",
        bankIBAN: (hostel as any).bankIBAN || "",
        bankTitle: (hostel as any).bankTitle || "",
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

    // Flexible billing: allow excluding certain components
    const includeRent = body.includeRent !== false;
    const includeFood = body.includeFood !== false;
    const includeMess = body.includeMess !== false;
    const includeUtilities = body.includeUtilities !== false;

    if (!month || !year) {
      return NextResponse.json({ error: "Month and year are required" }, { status: 400 });
    }

    // Validate month/year range
    const myCheck = validateMonthYear(month, year);
    if (!myCheck.valid) {
      return NextResponse.json({ error: myCheck.error }, { status: 400 });
    }

    // Determine billing period
    let periodStart: Date;
    let periodEnd: Date;
    let weekNumber: number | null = null;
    let rentMultiplier = 1; // For prorating monthly rent to weekly

    if (billingCycle === "DAILY") {
      // Daily: bill for a specific date (body.date) or today
      const billDate = body.date ? new Date(body.date) : new Date();
      periodStart = new Date(billDate.getFullYear(), billDate.getMonth(), billDate.getDate(), 0, 0, 0);
      periodEnd = new Date(billDate.getFullYear(), billDate.getMonth(), billDate.getDate(), 23, 59, 59);
      rentMultiplier = 1 / 30; // 1 day out of 30
    } else if (billingCycle === "WEEKLY") {
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
        user: { select: { name: true } },
      },
    });

    // Fetch active extra charges for this hostel
    const extraCharges = await prisma.hostelExtraCharge.findMany({
      where: { hostelId: params.id, isActive: true },
    });
    const extraChargesTotal = extraCharges.reduce((sum, c) => sum + c.amount, 0);

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
    const hostelFixedFoodCharge = ((hostel as any).fixedFoodCharge || 0) * rentMultiplier;
    const dueDays = (hostel as any).billingDueDays || 7;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    // Previous period for balance carry-forward
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const billsToCreate = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (const resident of newResidents) {
      // --- Pro-rating: if resident joined mid-month, only charge for days resided ---
      let residentMultiplier = rentMultiplier; // for WEEKLY/BIWEEKLY already fractional
      let proRatedDays = billingCycle === "MONTHLY" ? daysInMonth : null;
      let proRateNote = "";

      if (billingCycle === "MONTHLY" && (resident as any).startDate) {
        const startDate = new Date((resident as any).startDate);
        // Check if resident joined during THIS billing month
        if (
          startDate.getFullYear() === year &&
          startDate.getMonth() + 1 === month
        ) {
          const joinDay = startDate.getDate();
          const daysResided = daysInMonth - joinDay + 1;
          residentMultiplier = daysResided / daysInMonth;
          proRatedDays = daysResided;
          proRateNote = `Pro-rated: ${daysResided}/${daysInMonth} days (joined ${startDate.toLocaleDateString("en-PK")})`;
        }
      }

      // Rent: freeRoom = 0, rentOverride = custom, else room's rentPerBed
      const baseRent = (resident as any).freeRoom ? 0 : ((resident as any).rentOverride ?? resident.room.rentPerBed);
      const roomRent = includeRent ? Math.round(baseRent * residentMultiplier) : 0;

      // Food order charges for this period (actual orders — not pro-rated, reflects real usage)
      let foodCharges = 0;
      if (includeFood) {
        const foodOrders = await prisma.foodOrder.findMany({
          where: {
            residentId: resident.id,
            hostelId: params.id,
            orderDate: { gte: periodStart, lte: periodEnd },
            status: { not: "CANCELLED" },
          },
        });
        foodCharges = foodOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      }

      // Parking fee (pro-rated same as rent)
      const parkingFee = includeUtilities
        ? Math.round(resident.parking.reduce((sum, p) => sum + p.monthlyFee, 0) * residentMultiplier)
        : 0;

      // Meter charges (actual readings — not pro-rated)
      let meterCharges = 0;
      if (includeUtilities) {
        const meterReadings = await prisma.meterReading.findMany({
          where: {
            roomId: resident.roomId,
            hostelId: params.id,
            readingDate: { gte: periodStart, lte: periodEnd },
          },
        });
        meterCharges = meterReadings.reduce((sum, m) => sum + m.amount, 0);
      }

      // Previous balance carry-forward
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

      // Food plan: FULL_MESS = fixed hostel charge (pro-rated), NO_MESS = 0, CUSTOM = resident's own fee
      const foodPlan = (resident as any).foodPlan || "FULL_MESS";
      let fixedFoodFee = 0;
      if (includeMess) {
        if (foodPlan === "FULL_MESS") {
          fixedFoodFee = Math.round(((hostel as any).fixedFoodCharge || 0) * residentMultiplier);
        } else if (foodPlan === "CUSTOM") {
          fixedFoodFee = Math.round(((resident as any).customFoodFee || 0) * residentMultiplier);
        }
      }
      // NO_MESS = 0 fixed fee — only actual food orders are charged

      const otherCharges = Math.round(extraChargesTotal * residentMultiplier);
      const grossAmount = roomRent + foodCharges + fixedFoodFee + parkingFee +
        meterCharges + otherCharges + previousBalance;
      const actualDeduction = Math.min(advanceDeduction, grossAmount);
      const totalAmount = grossAmount - actualDeduction;

      // Build partial billing notes
      const partialNotes: string[] = [];
      if (proRateNote) partialNotes.push(proRateNote);
      if (!includeRent) partialNotes.push("Rent excluded.");
      if (!includeFood) partialNotes.push("Food orders excluded.");
      if (!includeMess) partialNotes.push("Mess fee excluded.");
      if (!includeUtilities) partialNotes.push("Utilities excluded.");
      if (extraCharges.length > 0 && otherCharges > 0) {
        partialNotes.push(`Extra charges: ${extraCharges.map(c => c.name).join(', ')}.`);
      }
      const finalNotes = partialNotes.join(" ") || undefined;

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
        fixedFoodFee,
        otherCharges,
        meterCharges,
        parkingFee,
        previousBalance,
        advanceDeduction: actualDeduction,
        totalAmount: Math.max(0, totalAmount),
        paidAmount: 0,
        balance: Math.max(0, totalAmount),
        status: (Math.max(0, totalAmount) === 0 ? "PAID" : "UNPAID") as any,
        dueDate,
        notes: finalNotes,
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

// PATCH: Recalculate food charges on existing bills (picks up new orders placed after generation)
export async function PATCH(
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
    const { month, year } = body;

    if (!month || !year) {
      return NextResponse.json({ error: "Month and year are required" }, { status: 400 });
    }

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    // Find all existing bills for this period
    const existingBills = await prisma.monthlyBill.findMany({
      where: { hostelId: params.id, month, year },
      include: { resident: true },
    });

    if (existingBills.length === 0) {
      return NextResponse.json({ message: "No bills found for this period to recalculate", count: 0 });
    }

    let updatedCount = 0;

    for (const bill of existingBills) {
      // Recalculate food order charges (exclude cancelled)
      const foodOrders = await prisma.foodOrder.findMany({
        where: {
          residentId: bill.residentId,
          hostelId: params.id,
          orderDate: { gte: periodStart, lte: periodEnd },
          status: { not: "CANCELLED" },
        },
      });
      const newFoodCharges = foodOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      // Only update if food charges changed
      if (newFoodCharges !== bill.foodCharges) {
        const diff = newFoodCharges - bill.foodCharges;
        const newTotal = Math.max(0, bill.totalAmount + diff);
        const newBalance = Math.max(0, newTotal - bill.paidAmount);
        let newStatus = bill.status;
        if (newBalance <= 0) newStatus = "PAID";
        else if (bill.paidAmount > 0) newStatus = "PARTIAL";
        else if (bill.dueDate && new Date(bill.dueDate) < new Date()) newStatus = "OVERDUE";
        else newStatus = "UNPAID";

        await prisma.monthlyBill.update({
          where: { id: bill.id },
          data: {
            foodCharges: newFoodCharges,
            totalAmount: newTotal,
            balance: newBalance,
            status: newStatus,
          },
        });
        updatedCount++;
      }
    }

    return NextResponse.json({
      message: updatedCount > 0
        ? `Recalculated ${updatedCount} bill(s) with updated food charges`
        : "All bills already up to date — no changes needed",
      count: updatedCount,
    });
  } catch (error) {
    console.error("Recalculate bills error:", error);
    return NextResponse.json({ error: "Failed to recalculate bills" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.user.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const billId = searchParams.get("deleteBillId");
    if (!billId) {
      return NextResponse.json({ error: "Bill ID required" }, { status: 400 });
    }

    const bill = await prisma.monthlyBill.findFirst({
      where: { id: billId, hostelId: params.id },
      include: { payments: true },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (bill.payments.length > 0 || bill.paidAmount > 0) {
      return NextResponse.json({ error: "Cannot delete a bill with payments. Remove payments first." }, { status: 400 });
    }

    await prisma.monthlyBill.delete({ where: { id: billId } });
    return NextResponse.json({ message: "Bill deleted successfully" });
  } catch (error) {
    console.error("Delete bill error:", error);
    return NextResponse.json({ error: "Failed to delete bill" }, { status: 500 });
  }
}
