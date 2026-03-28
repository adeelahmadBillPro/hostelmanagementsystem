import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPlanLimits } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.user.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const limits = await getPlanLimits(tenantId);

    // Get current usage
    const hostelCount = await prisma.hostel.count({ where: { tenantId } });
    const hostels = await prisma.hostel.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });

    let totalResidents = 0;
    let totalRooms = 0;
    let totalStaff = 0;
    for (const h of hostels) {
      totalResidents += await prisma.resident.count({ where: { hostelId: h.id, status: "ACTIVE" } });
      totalRooms += await prisma.room.count({ where: { floor: { building: { hostelId: h.id } } } });
      totalStaff += await prisma.staff.count({ where: { hostelId: h.id } });
    }

    return NextResponse.json({
      plan: {
        name: limits.planName,
        isTrial: limits.isTrial,
        trialExpired: limits.trialExpired,
        trialEndsAt: limits.trialEndsAt?.toISOString() || null,
        daysLeft: limits.daysLeft,
        features: limits.features,
      },
      limits: {
        maxHostels: limits.maxHostels,
        maxResidents: limits.maxResidents,
        maxRooms: limits.maxRooms,
        maxStaff: limits.maxStaff,
      },
      usage: {
        hostels: hostelCount,
        residents: totalResidents,
        rooms: totalRooms,
        staff: totalStaff,
      },
    });
  } catch (error) {
    console.error("Plan status error:", error);
    return NextResponse.json({ error: "Failed to get plan status" }, { status: 500 });
  }
}
