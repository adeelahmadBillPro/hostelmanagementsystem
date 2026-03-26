import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const hostelId = params.id;

    if (!type) {
      return NextResponse.json({ error: 'Report type is required' }, { status: 400 });
    }

    switch (type) {
      case 'occupancy':
        return NextResponse.json(await getOccupancyReport(hostelId));
      case 'revenue':
        return NextResponse.json(await getRevenueReport(hostelId));
      case 'expense':
        return NextResponse.json(await getExpenseReport(hostelId));
      case 'residents':
        return NextResponse.json(await getResidentList(hostelId));
      case 'payments':
        return NextResponse.json(await getPaymentSummary(hostelId));
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to generate report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getOccupancyReport(hostelId: string) {
  const rooms = await prisma.room.findMany({
    where: { floor: { building: { hostelId } } },
    include: {
      beds: {
        include: {
          residents: {
            select: { id: true, status: true },
          },
        },
      },
    },
  });

  let totalBeds = 0;
  let occupiedBeds = 0;

  const roomBreakdown = rooms.map((room: any) => {
    const roomTotalBeds = room.beds.length;
    const roomOccupiedBeds = room.beds.filter(
      (bed: any) => bed.residents && bed.residents.some((r: any) => r.status === 'ACTIVE')
    ).length;
    const roomVacantBeds = roomTotalBeds - roomOccupiedBeds;

    totalBeds += roomTotalBeds;
    occupiedBeds += roomOccupiedBeds;

    return {
      roomNumber: room.roomNumber,
      totalBeds: roomTotalBeds,
      occupiedBeds: roomOccupiedBeds,
      vacantBeds: roomVacantBeds,
    };
  });

  const vacantBeds = totalBeds - occupiedBeds;
  const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

  return {
    totalRooms: rooms.length,
    totalBeds,
    occupiedBeds,
    vacantBeds,
    occupancyRate,
    roomBreakdown,
  };
}

async function getRevenueReport(hostelId: string) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const monthlyRevenue = [];
  let totalRevenue = 0;

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = date.getMonth();
    const year = date.getFullYear();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const payments = await prisma.payment.findMany({
      where: {
        hostelId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const rent = payments.reduce((sum: number, p: any) => sum + p.amount, 0);

    let food = 0;
    try {
      const foodOrders = await prisma.foodOrder.findMany({
        where: {
          hostelId,
          orderDate: { gte: startDate, lte: endDate },
        },
      });
      food = foodOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
    } catch {
      // foodOrder model may not exist
    }

    // Other income placeholder (no Income model in schema)
    const other = 0;

    const total = rent + food + other;
    totalRevenue += total;

    monthlyRevenue.push({
      month: `${monthNames[month]} ${year}`,
      rent,
      food,
      other,
      total,
    });
  }

  return { monthlyRevenue, totalRevenue };
}

async function getExpenseReport(hostelId: string) {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const expenses = await prisma.expense.findMany({
    where: {
      hostelId,
      date: { gte: startDate, lte: endDate },
    },
    include: { category: true },
  });

  const categoryMap: Record<string, number> = {};
  expenses.forEach((e: any) => {
    const catName = e.category?.name || 'Uncategorized';
    categoryMap[catName] = (categoryMap[catName] || 0) + e.amount;
  });

  const categories = Object.entries(categoryMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);

  return { categories, totalExpenses };
}

async function getResidentList(hostelId: string) {
  const residents = await prisma.resident.findMany({
    where: { hostelId },
    include: {
      user: { select: { name: true, cnic: true, phone: true } },
      bed: {
        include: {
          room: { select: { roomNumber: true } },
        },
      },
    },
    orderBy: { user: { name: 'asc' } },
  });

  const formattedResidents = residents.map((r: any) => ({
    name: r.user?.name || 'Unknown',
    cnic: r.user?.cnic || '',
    phone: r.user?.phone || '',
    roomNumber: r.bed?.room?.roomNumber || 'N/A',
    bedNumber: r.bed?.bedNumber || 'N/A',
    status: r.status,
    joiningDate: r.moveInDate?.toISOString() || '',
  }));

  return { residents: formattedResidents, totalResidents: residents.length };
}

async function getPaymentSummary(hostelId: string) {
  const payments = await prisma.payment.findMany({
    where: {
      hostelId,
    },
  });

  const methodMap: Record<string, { count: number; amount: number }> = {};
  payments.forEach((p: any) => {
    const method = p.method || 'UNKNOWN';
    if (!methodMap[method]) {
      methodMap[method] = { count: 0, amount: 0 };
    }
    methodMap[method].count += 1;
    methodMap[method].amount += p.amount;
  });

  const byMethod = Object.entries(methodMap).map(([method, data]) => ({
    method,
    count: data.count,
    amount: data.amount,
  }));

  const totalPayments = payments.length;
  const totalAmount = payments.reduce((sum: number, p: any) => sum + p.amount, 0);

  return { byMethod, totalPayments, totalAmount };
}
