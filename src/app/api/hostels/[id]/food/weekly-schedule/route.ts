import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = rateLimit(request, "standard");
  if (limited) return limited;

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
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: "updates must be an array" },
        { status: 400 }
      );
    }

    const validDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    let updatedCount = 0;

    for (const update of updates) {
      const { menuId, availableDays } = update;

      if (!menuId || !Array.isArray(availableDays)) {
        continue;
      }

      // Validate days
      const filteredDays = availableDays.filter((d: string) =>
        validDays.includes(d)
      );

      // Verify menu item belongs to this hostel
      const menuItem = await prisma.foodMenu.findFirst({
        where: { id: menuId, hostelId: params.id },
      });

      if (!menuItem) {
        continue;
      }

      await prisma.foodMenu.update({
        where: { id: menuId },
        data: { availableDays: filteredDays },
      });

      updatedCount++;
    }

    return NextResponse.json({
      message: `Updated ${updatedCount} menu items`,
      updatedCount,
    });
  } catch (error) {
    console.error("Weekly schedule update error:", error);
    return NextResponse.json(
      { error: "Failed to update weekly schedule" },
      { status: 500 }
    );
  }
}
