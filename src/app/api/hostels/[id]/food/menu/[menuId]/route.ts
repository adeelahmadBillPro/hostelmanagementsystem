import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; menuId: string } }
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

    const existing = await prisma.foodMenu.findFirst({
      where: { id: params.menuId, hostelId: params.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { mealType, itemName, rate, availableDays, isActive } = body;

    const updateData: any = {};
    if (mealType !== undefined) {
      if (!["BREAKFAST", "LUNCH", "DINNER", "SNACK"].includes(mealType)) {
        return NextResponse.json(
          { error: "Invalid meal type" },
          { status: 400 }
        );
      }
      updateData.mealType = mealType;
    }
    if (itemName !== undefined) updateData.itemName = itemName;
    if (rate !== undefined) {
      if (rate < 0) {
        return NextResponse.json(
          { error: "Rate must be non-negative" },
          { status: 400 }
        );
      }
      updateData.rate = rate;
    }
    if (availableDays !== undefined) updateData.availableDays = availableDays;
    if (isActive !== undefined) updateData.isActive = isActive;

    const menuItem = await prisma.foodMenu.update({
      where: { id: params.menuId },
      data: updateData,
    });

    return NextResponse.json(menuItem);
  } catch (error) {
    console.error("Update menu item error:", error);
    return NextResponse.json(
      { error: "Failed to update menu item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; menuId: string } }
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

    const existing = await prisma.foodMenu.findFirst({
      where: { id: params.menuId, hostelId: params.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 }
      );
    }

    // Check if there are food orders linked to this menu item
    const ordersCount = await prisma.foodOrder.count({
      where: { menuId: params.menuId },
    });

    if (ordersCount > 0) {
      // Soft delete - just deactivate
      await prisma.foodMenu.update({
        where: { id: params.menuId },
        data: { isActive: false },
      });
      return NextResponse.json({
        message: "Menu item deactivated (has linked orders)",
      });
    }

    await prisma.foodMenu.delete({
      where: { id: params.menuId },
    });

    return NextResponse.json({ message: "Menu item deleted successfully" });
  } catch (error) {
    console.error("Delete menu item error:", error);
    return NextResponse.json(
      { error: "Failed to delete menu item" },
      { status: 500 }
    );
  }
}
