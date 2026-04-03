import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPortalSession } from '@/lib/session';
import { rateLimit } from "@/lib/rate-limit";

// Default ordering windows (used when hostel hasn't set custom times)
const DEFAULT_WINDOWS: Record<string, { start: number; end: number }> = {
  BREAKFAST: { start: 6, end: 9 },
  LUNCH: { start: 11, end: 14 },
  DINNER: { start: 18, end: 21 },
  SNACK: { start: 10, end: 22 },
};

// Build per-hostel time windows from hostel settings
function getHostelTimeWindows(hostel: any): Record<string, { start: number; end: number }> {
  return {
    BREAKFAST: { start: hostel.breakfastStart ?? 6,  end: hostel.breakfastEnd ?? 9 },
    LUNCH:     { start: hostel.lunchStart ?? 11,     end: hostel.lunchEnd ?? 14 },
    DINNER:    { start: hostel.dinnerStart ?? 18,    end: hostel.dinnerEnd ?? 21 },
    SNACK:     { start: hostel.snackStart ?? 10,     end: hostel.snackEnd ?? 22 },
  };
}

function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function isOrderable(mealType: string, windows: Record<string, { start: number; end: number }>): boolean {
  const window = windows[mealType];
  if (!window) return false;
  const now = new Date();
  const hour = now.getHours();
  return hour >= window.start && hour < window.end;
}

function getOrderingHours(mealType: string, windows: Record<string, { start: number; end: number }>): string {
  const window = windows[mealType];
  if (!window) return '';
  return `${formatHour(window.start)} - ${formatHour(window.end)}`;
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getPortalSession();
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

    const hostelWindows = getHostelTimeWindows(resident.hostel);

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
      itemName: item.itemName,
      rate: item.rate,
      mealType: item.mealType,
      isActive: item.isActive,
      availableDays: item.availableDays,
      category: item.category || "main",
      isFree: item.isFree || false,
      freeWithMeal: item.freeWithMeal || false,
      freeQtyLimit: item.freeQtyLimit || 0,
      extraRate: item.extraRate || 0,
      maxQtyPerOrder: item.maxQtyPerOrder || 10,
      isOrderable: isOrderable(item.mealType, hostelWindows),
      orderingHours: getOrderingHours(item.mealType, hostelWindows),
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

    // Add ordering windows info to response
    const orderingWindows = Object.entries(hostelWindows).map(([meal, w]) => ({
      mealType: meal,
      start: formatHour(w.start),
      end: formatHour(w.end),
      startHour: w.start,
      endHour: w.end,
      isOpen: isOrderable(meal, hostelWindows),
    }));

    // Today's orders
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    const todayOrdersRaw = await prisma.foodOrder.findMany({
      where: {
        residentId: resident.id,
        orderDate: { gte: todayStart, lte: todayEnd },
      },
      include: { menu: { select: { itemName: true, mealType: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const todayOrders = todayOrdersRaw.map((o: any) => ({
      id: o.id,
      itemName: o.menu?.itemName || 'Unknown',
      mealType: o.menu?.mealType || 'SNACK',
      quantity: o.quantity,
      totalAmount: o.totalAmount,
      status: o.status || 'PENDING',
      deliveredAt: o.deliveredAt,
      createdAt: o.createdAt,
    }));

    // Recent orders (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentOrdersRaw = await prisma.foodOrder.findMany({
      where: { residentId: resident.id, orderDate: { gte: sevenDaysAgo } },
      include: { menu: { select: { itemName: true, mealType: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const recentOrders = recentOrdersRaw.map((o: any) => ({
      id: o.id,
      itemName: o.menu?.itemName || 'Unknown',
      mealType: o.menu?.mealType || 'SNACK',
      quantity: o.quantity,
      totalAmount: o.totalAmount,
      status: o.status || 'PENDING',
      orderDate: o.orderDate,
      createdAt: o.createdAt,
    }));

    return NextResponse.json({
      menu,
      summary,
      orderingWindows,
      todayOrders,
      recentOrders,
      foodPlan: (resident as any).foodPlan || 'FULL_MESS',
      customFoodFee: (resident as any).customFoodFee || 0,
      hostelFoodCharge: (resident.hostel as any).fixedFoodCharge || 0,
    });
  } catch (error) {
    console.error('Failed to fetch food menu:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "sensitive");
  if (limited) return limited;

  try {
    const session = await getPortalSession();
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

    const postWindows = getHostelTimeWindows(resident.hostel);
    const body = await request.json();

    // Support both old single-item format and new multi-item format
    const items: { menuId: string; quantity: number }[] = body.items
      ? body.items
      : [{ menuId: body.menuId, quantity: body.quantity || 1 }];

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    // Validate all menu items exist
    const menuIds = items.map((i) => i.menuId);
    const menuItemsFromDb = await prisma.foodMenu.findMany({
      where: { id: { in: menuIds }, hostelId: resident.hostelId, isActive: true },
    });

    const menuMap = new Map(menuItemsFromDb.map((m: any) => [m.id, m]));

    for (const item of items) {
      if (!menuMap.has(item.menuId)) {
        return NextResponse.json(
          { error: `Menu item ${item.menuId} not found or not available` },
          { status: 404 }
        );
      }
      const menuItem: any = menuMap.get(item.menuId);
      const qty = item.quantity || 1;
      if (qty > menuItem.maxQtyPerOrder) {
        return NextResponse.json(
          { error: `Max quantity for "${menuItem.itemName}" is ${menuItem.maxQtyPerOrder}` },
          { status: 400 }
        );
      }

      // Time lock check - reject orders outside time window
      const mealType = menuItem.mealType as string;
      if (!isOrderable(mealType, postWindows)) {
        const hours = getOrderingHours(mealType, postWindows);
        return NextResponse.json(
          {
            error: `Ordering for ${mealType.toLowerCase()} is closed. Available ${hours}`,
          },
          { status: 400 }
        );
      }
    }

    // Check if there's a "main" category item in this order
    const hasMainItem = items.some((item) => {
      const menuItem: any = menuMap.get(item.menuId);
      return menuItem && menuItem.category === 'main';
    });

    // Calculate price and create orders
    const createdOrders = [];
    let grandTotal = 0;

    for (const item of items) {
      const menuItem: any = menuMap.get(item.menuId);
      const qty = item.quantity || 1;
      let totalAmount = 0;

      if (menuItem.isFree) {
        // Always free
        totalAmount = 0;
      } else if (menuItem.freeWithMeal) {
        if (hasMainItem) {
          // Free up to freeQtyLimit when ordered with a main dish
          if (menuItem.freeQtyLimit > 0) {
            const freeQty = Math.min(qty, menuItem.freeQtyLimit);
            const extraQty = Math.max(0, qty - freeQty);
            totalAmount = extraQty * (menuItem.extraRate || menuItem.rate);
          } else {
            // freeQtyLimit = 0 means unlimited free with meal
            totalAmount = 0;
          }
        } else {
          // No main item in order, charge extraRate per unit
          totalAmount = qty * (menuItem.extraRate || menuItem.rate);
        }
      } else {
        // Regular item
        totalAmount = menuItem.rate * qty;
      }

      const order = await prisma.foodOrder.create({
        data: {
          hostelId: resident.hostelId,
          residentId: resident.id,
          menuId: item.menuId,
          quantity: qty,
          totalAmount,
        },
        include: { menu: true },
      });

      createdOrders.push(order);
      grandTotal += totalAmount;
    }

    return NextResponse.json(
      {
        orders: createdOrders,
        grandTotal,
        itemCount: createdOrders.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create food order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
