import { PrismaClient, Prisma } from "@prisma/client";

type PrismaTx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * Generate a monthly bill for a single resident.
 * Calculates: roomRent, foodCharges, parkingFee, meterCharges, previousBalance, advanceDeduction.
 * Returns the created bill or null if already exists.
 */
export async function generateBillForResident(
  residentId: string,
  month: number,
  year: number,
  hostelId: string,
  tx: PrismaTx
) {
  // Check if bill already exists
  const existing = await tx.monthlyBill.findUnique({
    where: { residentId_month_year: { residentId, month, year } },
  });
  if (existing) return null;

  // Get resident with room info
  const resident = await tx.resident.findUnique({
    where: { id: residentId },
    include: {
      room: true,
      bed: true,
      parking: true,
    },
  });
  if (!resident || resident.status !== "ACTIVE") return null;

  // Room rent
  const roomRent = resident.room.rentPerBed;

  // Food charges - sum of food orders for this month
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const foodAgg = await tx.foodOrder.aggregate({
    where: {
      residentId,
      hostelId,
      orderDate: { gte: monthStart, lt: monthEnd },
    },
    _sum: { totalAmount: true },
  });
  const foodCharges = foodAgg._sum.totalAmount || 0;

  // Parking fee
  const parkingFee = resident.parking.reduce(
    (sum: number, p: { monthlyFee: number }) => sum + p.monthlyFee,
    0
  );

  // Meter charges - sum of meter readings for this month
  const meterAgg = await tx.meterReading.aggregate({
    where: {
      roomId: resident.roomId,
      hostelId,
      readingDate: { gte: monthStart, lt: monthEnd },
    },
    _sum: { amount: true },
  });
  const meterCharges = meterAgg._sum.amount || 0;

  // Previous balance from last month
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevBill = await tx.monthlyBill.findUnique({
    where: {
      residentId_month_year: { residentId, month: prevMonth, year: prevYear },
    },
  });
  const previousBalance = prevBill?.balance || 0;

  // Advance deduction (use from resident, can be adjusted)
  const advanceDeduction = 0; // Manager can edit later

  // Calculate total
  const totalAmount =
    roomRent +
    foodCharges +
    parkingFee +
    meterCharges +
    previousBalance -
    advanceDeduction;
  const balance = totalAmount;

  // Create bill
  const bill = await tx.monthlyBill.create({
    data: {
      residentId,
      hostelId,
      month,
      year,
      roomRent,
      foodCharges,
      otherCharges: 0,
      meterCharges,
      parkingFee,
      previousBalance,
      advanceDeduction,
      totalAmount,
      paidAmount: 0,
      balance,
      status: "UNPAID",
    },
  });

  return bill;
}

/**
 * Mark overdue bills for a hostel.
 * Updates UNPAID/PARTIAL bills past their due date to OVERDUE.
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
