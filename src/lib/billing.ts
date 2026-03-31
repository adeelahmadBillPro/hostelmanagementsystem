import { PrismaClient } from "@prisma/client";

type PrismaTx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * Generate a monthly bill for a single resident.
 * Handles: freeRoom, rentOverride, foodPlan (FULL_MESS/NO_MESS/CUSTOM), fixedFoodFee, dueDate.
 */
export async function generateBillForResident(
  residentId: string,
  month: number,
  year: number,
  hostelId: string,
  tx: PrismaTx
) {
  const existing = await tx.monthlyBill.findFirst({
    where: { residentId, month, year, weekNumber: null },
  });
  if (existing) return null;

  const resident = await tx.resident.findUnique({
    where: { id: residentId },
    include: {
      room: true,
      bed: true,
      parking: true,
      hostel: true,
    },
  });
  if (!resident || resident.status !== "ACTIVE") return null;

  // Room rent: freeRoom = 0, rentOverride = custom, else room's rentPerBed
  const roomRent = (resident as any).freeRoom
    ? 0
    : ((resident as any).rentOverride ?? resident.room.rentPerBed);

  // Food charges from app orders
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const foodAgg = await tx.foodOrder.aggregate({
    where: { residentId, hostelId, orderDate: { gte: monthStart, lt: monthEnd }, status: { not: "CANCELLED" } },
    _sum: { totalAmount: true },
  });
  const foodCharges = foodAgg._sum?.totalAmount || 0;

  // Fixed food fee based on food plan
  const hostelFoodCharge = (resident.hostel as any).fixedFoodCharge || 0;
  const foodPlan = (resident as any).foodPlan || "FULL_MESS";
  let fixedFoodFee = 0;
  if (foodPlan === "FULL_MESS") {
    fixedFoodFee = hostelFoodCharge;
  } else if (foodPlan === "CUSTOM") {
    fixedFoodFee = (resident as any).customFoodFee || 0;
  }
  // NO_MESS = 0 fixed fee

  // Parking fee
  const parkingFee = resident.parking.reduce(
    (sum: number, p: { monthlyFee: number }) => sum + p.monthlyFee,
    0
  );

  // Meter charges
  const meterAgg = await tx.meterReading.aggregate({
    where: { roomId: resident.roomId, hostelId, readingDate: { gte: monthStart, lt: monthEnd } },
    _sum: { amount: true },
  });
  const meterCharges = meterAgg._sum.amount || 0;

  // Previous balance
  const prevBill = await tx.monthlyBill.findFirst({
    where: { residentId, hostelId },
    orderBy: { createdAt: "desc" },
  });
  const previousBalance = prevBill?.balance || 0;

  // Advance deduction (first bill only)
  let advanceDeduction = 0;
  const billCount = await tx.monthlyBill.count({ where: { residentId } });
  if (billCount === 0 && resident.advancePaid > 0) {
    advanceDeduction = resident.advancePaid;
  }

  // Due date from hostel settings
  const dueDays = (resident.hostel as any).billingDueDays || 7;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);

  const grossAmount = roomRent + foodCharges + fixedFoodFee + parkingFee +
    meterCharges + previousBalance;
  // Only deduct advance up to the gross amount (unused advance carries to next month)
  const actualDeduction = Math.min(advanceDeduction, grossAmount);
  const totalAmount = grossAmount - actualDeduction;
  const balance = Math.max(0, totalAmount);

  const bill = await tx.monthlyBill.create({
    data: {
      residentId,
      hostelId,
      month,
      year,
      billingCycle: "MONTHLY",
      roomRent,
      foodCharges,
      fixedFoodFee,
      otherCharges: 0,
      meterCharges,
      parkingFee,
      previousBalance,
      advanceDeduction: actualDeduction,
      totalAmount: balance,
      paidAmount: 0,
      balance,
      status: balance === 0 ? "PAID" : "UNPAID",
      dueDate,
    },
  });

  return bill;
}

/**
 * Mark overdue bills for a hostel.
 */
export async function markOverdueBills(hostelId: string, prismaClient: PrismaTx) {
  const now = new Date();
  const result = await prismaClient.monthlyBill.updateMany({
    where: {
      hostelId,
      status: { in: ["UNPAID", "PARTIAL"] },
      dueDate: { not: null, lt: now },
    },
    data: { status: "OVERDUE" },
  });
  return result.count;
}
