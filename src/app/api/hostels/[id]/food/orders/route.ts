import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Your account is not linked to any organization. Please contact support." }, { status: 403 });
  }

  try {
    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const residentId = searchParams.get("residentId");

    const where: any = { hostelId: params.id };

    if (dateStr) {
      const date = new Date(dateStr);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      where.orderDate = { gte: startOfDay, lte: endOfDay };
    }

    if (residentId) {
      where.residentId = residentId;
    }

    const orders = await prisma.foodOrder.findMany({
      where,
      include: {
        resident: {
          include: {
            user: { select: { name: true } },
          },
        },
        menu: {
          select: { itemName: true, mealType: true, rate: true },
        },
      },
      orderBy: { orderDate: "desc" },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    const breakfastRevenue = orders
      .filter((o) => o.menu.mealType === "BREAKFAST")
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const lunchRevenue = orders
      .filter((o) => o.menu.mealType === "LUNCH")
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const dinnerRevenue = orders
      .filter((o) => o.menu.mealType === "DINNER")
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const snackRevenue = orders
      .filter((o) => o.menu.mealType === "SNACK")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    return NextResponse.json({
      orders,
      stats: {
        totalOrders,
        totalRevenue,
        breakfastRevenue,
        lunchRevenue,
        dinnerRevenue,
        snackRevenue,
      },
    });
  } catch (error) {
    console.error("Get food orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch food orders" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Your account is not linked to any organization. Please contact support." }, { status: 403 });
  }

  try {
    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const body = await request.json();
    const { residentId, menuId, quantity, orderDate } = body;

    if (!residentId || !menuId) {
      return NextResponse.json(
        { error: "residentId and menuId are required" },
        { status: 400 }
      );
    }

    // Verify resident belongs to this hostel and is active
    const resident = await prisma.resident.findFirst({
      where: { id: residentId, hostelId: params.id, status: "ACTIVE" },
    });
    if (!resident) {
      return NextResponse.json(
        { error: "Active resident not found in this hostel" },
        { status: 404 }
      );
    }

    // Verify menu item belongs to this hostel and is active
    const menuItem = await prisma.foodMenu.findFirst({
      where: { id: menuId, hostelId: params.id, isActive: true },
    });
    if (!menuItem) {
      return NextResponse.json(
        { error: "Active menu item not found" },
        { status: 404 }
      );
    }

    const qty = quantity || 1;
    if (qty < 1) {
      return NextResponse.json(
        { error: "Quantity must be at least 1" },
        { status: 400 }
      );
    }

    const totalAmount = menuItem.rate * qty;

    const order = await prisma.foodOrder.create({
      data: {
        residentId,
        hostelId: params.id,
        menuId,
        quantity: qty,
        totalAmount,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
      },
      include: {
        resident: {
          include: {
            user: { select: { name: true } },
          },
        },
        menu: {
          select: { itemName: true, mealType: true, rate: true },
        },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Create food order error:", error);
    return NextResponse.json(
      { error: "Failed to create food order" },
      { status: 500 }
    );
  }
}
