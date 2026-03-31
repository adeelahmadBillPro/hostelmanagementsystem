import { PrismaClient } from "@prisma/client";

type PrismaTx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export interface SettlementPreview {
  resident: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    roomNumber: string;
    bedNumber: string;
    billingType: string;
  };
  stay: {
    checkInDate: string;
    checkoutDate: string;
    daysStayed: number;
    nightsStayed: number;
  };
  charges: {
    unpaidBills: { month: string; amount: number; billId: string }[];
    unpaidBillsTotal: number;
    proRatedRent: number;
    proRatedFood: number;
    unbilledOrders: number;
    unbilledMeter: number;
    unbilledParking: number;
    totalCharges: number;
  };
  credits: {
    securityDeposit: number;
    advanceBalance: number;
    overpayments: number;
    totalCredits: number;
  };
  netAmount: number;
  settlementType: "DUES" | "REFUND" | "SETTLED";
}

/**
 * Calculate settlement preview for a resident checkout.
 * Works for all billing types: MONTHLY, WEEKLY, DAILY, PER_NIGHT
 */
export async function calculateSettlement(
  residentId: string,
  checkoutDate: Date,
  tx: PrismaTx
): Promise<SettlementPreview> {
  const resident = await tx.resident.findUnique({
    where: { id: residentId },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      hostel: true,
      room: { select: { roomNumber: true, rentPerBed: true, dailyRate: true, nightlyRate: true, weeklyRate: true } },
      bed: { select: { bedNumber: true } },
      parking: true,
    },
  });

  if (!resident || resident.status !== "ACTIVE") {
    throw new Error("Resident not found or not active");
  }

  const r = resident as any;
  const billingType: string = r.billingType || "MONTHLY";
  const moveIn = new Date(resident.moveInDate);
  const checkout = new Date(checkoutDate);

  // Calculate days/nights
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysStayed = Math.max(1, Math.ceil((checkout.getTime() - moveIn.getTime()) / msPerDay));
  const nightsStayed = Math.max(1, daysStayed); // For per-night, same as days

  // ── CHARGES ──────────────────────────────────────────────────────────

  // A. Unpaid previous bills
  const unpaidBillsRaw = await tx.monthlyBill.findMany({
    where: { residentId, status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] } },
    select: { id: true, month: true, year: true, balance: true },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const unpaidBills = unpaidBillsRaw.map((b) => ({
    month: `${monthNames[b.month - 1]} ${b.year}`,
    amount: b.balance,
    billId: b.id,
  }));
  const unpaidBillsTotal = unpaidBills.reduce((sum, b) => sum + b.amount, 0);

  // B. Pro-rated rent for current period
  const roomRent = r.freeRoom ? 0 : (r.rentOverride ?? resident.room.rentPerBed);
  let proRatedRent = 0;

  if (billingType === "MONTHLY") {
    // Days in current month
    const now = checkout;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    // Check if current month bill already exists
    const currentMonthBill = await tx.monthlyBill.findFirst({
      where: { residentId, month: now.getMonth() + 1, year: now.getFullYear() },
    });
    if (!currentMonthBill) {
      // No bill for current month, calculate pro-rated
      proRatedRent = Math.round((dayOfMonth / daysInMonth) * roomRent);
    }
    // If bill exists, it's already in unpaidBills
  } else if (billingType === "WEEKLY") {
    const rate = resident.room.weeklyRate || Math.round(roomRent * 7 / 30);
    // Days since last bill or check-in
    const lastBill = await tx.monthlyBill.findFirst({
      where: { residentId },
      orderBy: { createdAt: "desc" },
      select: { periodEnd: true },
    });
    const periodStart = lastBill?.periodEnd ? new Date(lastBill.periodEnd) : moveIn;
    const unbilledDays = Math.max(0, Math.ceil((checkout.getTime() - periodStart.getTime()) / msPerDay));
    proRatedRent = Math.round((unbilledDays / 7) * rate);
  } else if (billingType === "DAILY") {
    const rate = resident.room.dailyRate || Math.round(roomRent / 30);
    // For daily, all charges are at checkout
    const lastBill = await tx.monthlyBill.findFirst({
      where: { residentId },
      orderBy: { createdAt: "desc" },
      select: { periodEnd: true },
    });
    const periodStart = lastBill?.periodEnd ? new Date(lastBill.periodEnd) : moveIn;
    const unbilledDays = Math.max(1, Math.ceil((checkout.getTime() - periodStart.getTime()) / msPerDay));
    proRatedRent = unbilledDays * rate;
  } else if (billingType === "PER_NIGHT") {
    const rate = resident.room.nightlyRate || resident.room.dailyRate || Math.round(roomRent / 30);
    const lastBill = await tx.monthlyBill.findFirst({
      where: { residentId },
      orderBy: { createdAt: "desc" },
      select: { periodEnd: true },
    });
    const periodStart = lastBill?.periodEnd ? new Date(lastBill.periodEnd) : moveIn;
    const unbilledNights = Math.max(1, Math.ceil((checkout.getTime() - periodStart.getTime()) / msPerDay));
    proRatedRent = unbilledNights * rate;
  }

  // C. Pro-rated food fee (only for MONTHLY/WEEKLY with fixed food fee)
  let proRatedFood = 0;
  const hostelFoodCharge = (resident.hostel as any).fixedFoodCharge || 0;
  const foodPlan = r.foodPlan || "FULL_MESS";

  if (billingType === "MONTHLY" && hostelFoodCharge > 0) {
    const now = checkout;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const currentMonthBill = await tx.monthlyBill.findFirst({
      where: { residentId, month: now.getMonth() + 1, year: now.getFullYear() },
    });
    if (!currentMonthBill) {
      if (foodPlan === "FULL_MESS") {
        proRatedFood = Math.round((dayOfMonth / daysInMonth) * hostelFoodCharge);
      } else if (foodPlan === "CUSTOM") {
        proRatedFood = Math.round((dayOfMonth / daysInMonth) * (r.customFoodFee || 0));
      }
    }
  }

  // D. Unbilled food orders (not included in any bill)
  const allBilledPeriodEnd = await tx.monthlyBill.findFirst({
    where: { residentId },
    orderBy: { periodEnd: "desc" },
    select: { periodEnd: true },
  });
  const unbilledFrom = allBilledPeriodEnd?.periodEnd
    ? new Date(allBilledPeriodEnd.periodEnd)
    : moveIn;

  const unbilledOrdersAgg = await tx.foodOrder.aggregate({
    where: {
      residentId,
      orderDate: { gt: unbilledFrom, lte: checkout },
      status: { not: "CANCELLED" },
    },
    _sum: { totalAmount: true },
  });
  const unbilledOrders = unbilledOrdersAgg._sum?.totalAmount || 0;

  // E. Unbilled meter charges
  const unbilledMeterAgg = await tx.meterReading.aggregate({
    where: {
      roomId: resident.roomId,
      hostelId: resident.hostelId,
      readingDate: { gt: unbilledFrom, lte: checkout },
    },
    _sum: { amount: true },
  });
  const unbilledMeter = unbilledMeterAgg._sum?.amount || 0;

  // F. Unbilled parking (pro-rated)
  let unbilledParking = 0;
  if (resident.parking.length > 0 && billingType === "MONTHLY") {
    const now = checkout;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const currentMonthBill = await tx.monthlyBill.findFirst({
      where: { residentId, month: now.getMonth() + 1, year: now.getFullYear() },
    });
    if (!currentMonthBill) {
      const totalParking = resident.parking.reduce((sum: number, p: any) => sum + p.monthlyFee, 0);
      unbilledParking = Math.round((dayOfMonth / daysInMonth) * totalParking);
    }
  }

  const totalCharges = unpaidBillsTotal + proRatedRent + proRatedFood +
    unbilledOrders + unbilledMeter + unbilledParking;

  // ── CREDITS ──────────────────────────────────────────────────────────

  const securityDeposit = r.securityDeposit || 0;

  // Advance balance: advance paid minus what was already deducted in first bill
  const firstBill = await tx.monthlyBill.findFirst({
    where: { residentId },
    orderBy: { createdAt: "asc" },
    select: { advanceDeduction: true },
  });
  const advanceUsed = firstBill?.advanceDeduction || 0;
  const advanceBalance = Math.max(0, (r.advancePaid || 0) - advanceUsed);

  // Overpayments: sum of (paidAmount - totalAmount) where paidAmount > totalAmount
  const overpaidBills = await tx.monthlyBill.findMany({
    where: { residentId, status: "PAID" },
    select: { paidAmount: true, totalAmount: true },
  });
  const overpayments = overpaidBills.reduce((sum, b) => {
    const over = b.paidAmount - b.totalAmount;
    return sum + (over > 0 ? over : 0);
  }, 0);

  const totalCredits = securityDeposit + advanceBalance + overpayments;

  // ── NET SETTLEMENT ───────────────────────────────────────────────────

  const netAmount = Math.round(totalCharges - totalCredits);
  let settlementType: "DUES" | "REFUND" | "SETTLED" = "SETTLED";
  if (netAmount > 0) settlementType = "DUES";
  else if (netAmount < 0) settlementType = "REFUND";

  return {
    resident: {
      id: resident.id,
      name: r.user?.name || "Unknown",
      email: r.user?.email || "",
      phone: r.user?.phone || null,
      roomNumber: resident.room.roomNumber,
      bedNumber: resident.bed?.bedNumber || "N/A",
      billingType,
    },
    stay: {
      checkInDate: moveIn.toISOString(),
      checkoutDate: checkout.toISOString(),
      daysStayed,
      nightsStayed,
    },
    charges: {
      unpaidBills,
      unpaidBillsTotal,
      proRatedRent,
      proRatedFood,
      unbilledOrders,
      unbilledMeter,
      unbilledParking,
      totalCharges,
    },
    credits: {
      securityDeposit,
      advanceBalance,
      overpayments,
      totalCredits,
    },
    netAmount,
    settlementType,
  };
}
