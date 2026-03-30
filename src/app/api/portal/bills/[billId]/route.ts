import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(
  _request: NextRequest,
  { params }: { params: { billId: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'RESIDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resident = await prisma.resident.findUnique({
      where: { userId: session.user.id },
      include: {
        room: {
          include: {
            floor: {
              include: {
                building: true,
              },
            },
          },
        },
        bed: true,
      },
    });

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    const { billId } = params;

    // Find bill and verify it belongs to this resident
    const bill = await prisma.monthlyBill.findUnique({
      where: { id: billId },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    if (bill.residentId !== resident.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get food orders for the bill's month/year
    const startOfMonth = new Date(bill.year, bill.month - 1, 1);
    const endOfMonth = new Date(bill.year, bill.month, 0, 23, 59, 59);

    const foodOrders = await prisma.foodOrder.findMany({
      where: {
        residentId: resident.id,
        orderDate: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { menu: true },
      orderBy: { orderDate: 'asc' },
    });

    const formattedFoodOrders = foodOrders.map((order: any) => ({
      id: order.id,
      orderDate: order.orderDate.toISOString(),
      quantity: order.quantity,
      totalAmount: order.totalAmount,
      menuItem: {
        itemName: order.menu.itemName,
        rate: order.menu.rate,
        mealType: order.menu.mealType,
        category: order.menu.category,
        isFree: order.menu.isFree,
      },
    }));

    // Get parking info
    const parkingRecords = await prisma.parking.findMany({
      where: { residentId: resident.id },
    });
    const parking = parkingRecords.length > 0
      ? {
          vehicleType: parkingRecords[0].vehicleType,
          vehicleNumber: parkingRecords[0].vehicleNumber,
          monthlyFee: parkingRecords[0].monthlyFee,
        }
      : null;

    // Get meter reading for this month
    const meterReadings = await prisma.meterReading.findMany({
      where: {
        roomId: resident.roomId,
        readingDate: { gte: startOfMonth, lte: endOfMonth },
      },
      orderBy: { readingDate: 'desc' },
      take: 1,
    });
    const meterReading = meterReadings.length > 0
      ? {
          previousReading: meterReadings[0].previousReading,
          currentReading: meterReadings[0].currentReading,
          units: meterReadings[0].units,
          ratePerUnit: meterReadings[0].ratePerUnit,
          amount: meterReadings[0].amount,
        }
      : null;

    // Get payments for this bill
    const payments = await prisma.payment.findMany({
      where: { billId: bill.id },
      orderBy: { date: 'desc' },
    });

    const formattedPayments = payments.map((p: any) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      date: p.date.toISOString(),
      receiptNumber: p.receiptNumber,
      notes: p.notes,
    }));

    // Get disputes for this bill
    const disputes = await prisma.billDispute.findMany({
      where: { billId: bill.id },
      orderBy: { createdAt: 'desc' },
    });

    const formattedDisputes = disputes.map((d: any) => ({
      id: d.id,
      category: d.category,
      description: d.description,
      status: d.status,
      resolution: d.resolution,
    }));

    return NextResponse.json({
      bill: {
        id: bill.id,
        month: bill.month,
        year: bill.year,
        roomRent: bill.roomRent,
        foodCharges: bill.foodCharges,
        otherCharges: bill.otherCharges,
        meterCharges: bill.meterCharges,
        parkingFee: bill.parkingFee,
        previousBalance: bill.previousBalance,
        advanceDeduction: bill.advanceDeduction,
        discount: bill.discount,
        totalAmount: bill.totalAmount,
        paidAmount: bill.paidAmount,
        balance: bill.balance,
        status: bill.status,
        dueDate: bill.dueDate?.toISOString() || null,
        notes: bill.notes,
        fixedFoodFee: bill.fixedFoodFee,
        isDisputed: bill.isDisputed,
      },
      foodPlan: resident.foodPlan || "FULL_MESS",
      room: {
        roomNumber: resident.room.roomNumber,
        type: resident.room.type,
        buildingName: resident.room.floor.building.name,
        floorName: resident.room.floor.name,
        bedNumber: resident.bed.bedNumber,
        rentPerBed: resident.room.rentPerBed,
      },
      foodOrders: formattedFoodOrders,
      parking,
      meterReading,
      payments: formattedPayments,
      disputes: formattedDisputes,
    });
  } catch (error) {
    console.error('Failed to fetch bill detail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
