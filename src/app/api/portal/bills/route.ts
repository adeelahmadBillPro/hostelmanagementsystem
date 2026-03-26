import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'RESIDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resident = await prisma.resident.findUnique({
      where: { userId: session.user.id },
      include: { hostel: true },
    });

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    // Fetch bills
    const bills = await prisma.monthlyBill.findMany({
      where: { residentId: resident.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    const formattedBills = bills.map((bill: any) => ({
      id: bill.id,
      month: bill.month,
      year: bill.year,
      monthLabel: `${monthNames[bill.month - 1]} ${bill.year}`,
      rentAmount: bill.roomRent || 0,
      foodCharges: bill.foodCharges || 0,
      utilityCharges: bill.meterCharges || 0,
      otherCharges: bill.otherCharges || 0,
      totalAmount: bill.totalAmount,
      status: bill.status,
      paidAmount: bill.paidAmount || 0,
      balance: bill.balance || 0,
      breakdown: [
        { label: 'Rent', amount: bill.roomRent || 0 },
        { label: 'Food Charges', amount: bill.foodCharges || 0 },
        { label: 'Meter Charges', amount: bill.meterCharges || 0 },
        { label: 'Parking Fee', amount: bill.parkingFee || 0 },
        { label: 'Other Charges', amount: bill.otherCharges || 0 },
      ].filter((item: any) => item.amount > 0),
    }));

    // Fetch payment history
    const payments = await prisma.payment.findMany({
      where: {
        hostelId: resident.hostelId,
        residentId: resident.id,
      },
      orderBy: { date: 'desc' },
    });

    const formattedPayments = payments.map((p: any) => ({
      id: p.id,
      amount: p.amount,
      paymentDate: p.date.toISOString(),
      paymentMethod: p.method || 'CASH',
      receiptNumber: p.receiptNumber || null,
    }));

    return NextResponse.json({
      bills: formattedBills,
      payments: formattedPayments,
    });
  } catch (error) {
    console.error('Failed to fetch bills:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
