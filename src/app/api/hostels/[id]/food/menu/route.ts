import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { foodMenuSchema } from "@/lib/validations";

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

    // Ordering time windows (from hostel settings)
    const fmtHr = (h: number) => h === 0 || h === 24 ? "12 AM" : h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`;
    const h = hostel as any;
    const orderingWindows = {
      BREAKFAST: { start: fmtHr(h.breakfastStart ?? 6), end: fmtHr(h.breakfastEnd ?? 9) },
      LUNCH:     { start: fmtHr(h.lunchStart ?? 11),    end: fmtHr(h.lunchEnd ?? 14) },
      DINNER:    { start: fmtHr(h.dinnerStart ?? 18),   end: fmtHr(h.dinnerEnd ?? 21) },
      SNACK:     { start: fmtHr(h.snackStart ?? 10),    end: fmtHr(h.snackEnd ?? 22) },
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
  const limited = rateLimit(request, "standard");
  if (limited) return limited;

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
    const parsed = foodMenuSchema.safeParse({
      ...body,
      rate: Number(body.rate) || 0,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { mealType, itemName, rate, availableDays } = parsed.data;

    const menuItem = await prisma.foodMenu.create({
      data: {
        mealType,
        itemName,
        rate,
        availableDays,
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
