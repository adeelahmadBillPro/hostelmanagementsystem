import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(_request: NextRequest) {
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

    // Get today's menu
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const menuItems = await prisma.foodMenu.findMany({
      where: {
        hostelId: resident.hostelId,
        isActive: true,
      },
      orderBy: [{ mealType: 'asc' }, { itemName: 'asc' }],
    });

    // Filter items available today (show all if availableDays is empty)
    const todayMenuItems = menuItems.filter(
      (item: any) =>
        item.availableDays.length === 0 ||
        item.availableDays.some((d: string) => d.toLowerCase() === dayOfWeek)
    );

    const menu = todayMenuItems.map((item: any) => ({
      id: item.id,
      name: item.itemName,
      rate: item.rate,
      mealType: item.mealType,
      available: item.isActive,
      availableDays: item.availableDays,
    }));

    // Monthly food expense summary
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const orders = await prisma.foodOrder.findMany({
      where: {
        residentId: resident.id,
        orderDate: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const summary = {
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum: number, o: any) => sum + o.totalAmount, 0),
    };

    return NextResponse.json({ menu, summary });
  } catch (error) {
    console.error('Failed to fetch food menu:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const { menuId, quantity } = await request.json();

    if (!menuId) {
      return NextResponse.json({ error: 'Menu item is required' }, { status: 400 });
    }

    const menuItem = await prisma.foodMenu.findFirst({
      where: { id: menuId, hostelId: resident.hostelId, isActive: true },
    });

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found or not available' }, { status: 404 });
    }

    const qty = quantity || 1;
    const totalAmount = menuItem.rate * qty;

    const order = await prisma.foodOrder.create({
      data: {
        hostelId: resident.hostelId,
        residentId: resident.id,
        menuId,
        quantity: qty,
        totalAmount,
      },
      include: { menu: true },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Failed to create food order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
