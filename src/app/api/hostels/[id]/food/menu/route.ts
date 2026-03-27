import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
  }

  try {
    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const mealType = searchParams.get("mealType");

    const where: any = { hostelId: params.id };
    if (mealType) {
      where.mealType = mealType;
    }

    const menuItems = await prisma.foodMenu.findMany({
      where,
      orderBy: [{ mealType: "asc" }, { itemName: "asc" }],
    });

    const totalItems = menuItems.length;
    const activeItems = menuItems.filter((m) => m.isActive).length;
    const avgPrice =
      totalItems > 0
        ? Math.round(menuItems.reduce((sum, m) => sum + m.rate, 0) / totalItems)
        : 0;

    // Ordering time windows
    const orderingWindows = {
      BREAKFAST: { start: "6 AM", end: "9 AM" },
      LUNCH: { start: "11 AM", end: "2 PM" },
      DINNER: { start: "6 PM", end: "9 PM" },
      SNACK: { start: "10 AM", end: "10 PM" },
    };

    return NextResponse.json({
      menuItems,
      stats: {
        totalItems,
        activeItems,
        avgPrice,
      },
      orderingWindows,
    });
  } catch (error) {
    console.error("Get menu error:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu" },
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
  }

  try {
    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const body = await request.json();
    const { mealType, itemName, rate, availableDays } = body;

    if (!mealType || !itemName || rate === undefined) {
      return NextResponse.json(
        { error: "mealType, itemName, and rate are required" },
        { status: 400 }
      );
    }

    if (!["BREAKFAST", "LUNCH", "DINNER", "SNACK"].includes(mealType)) {
      return NextResponse.json(
        { error: "Invalid meal type" },
        { status: 400 }
      );
    }

    if (rate < 0) {
      return NextResponse.json(
        { error: "Rate must be non-negative" },
        { status: 400 }
      );
    }

    const menuItem = await prisma.foodMenu.create({
      data: {
        mealType,
        itemName,
        rate,
        availableDays: availableDays || [],
        isActive: true,
        hostelId: params.id,
      },
    });

    return NextResponse.json(menuItem, { status: 201 });
  } catch (error) {
    console.error("Create menu item error:", error);
    return NextResponse.json(
      { error: "Failed to create menu item" },
      { status: 500 }
    );
  }
}
