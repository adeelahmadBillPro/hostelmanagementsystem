import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// PATCH: Admin/Manager toggles portal access for a resident
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; residentId: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["TENANT_ADMIN", "HOSTEL_MANAGER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId! },
    });
    if (!hostel) return NextResponse.json({ error: "Hostel not found" }, { status: 404 });

    const resident = await prisma.resident.findFirst({
      where: { id: params.residentId, hostelId: params.id },
      select: { id: true, userId: true, user: { select: { isActive: true, name: true } } },
    });
    if (!resident) return NextResponse.json({ error: "Resident not found" }, { status: 404 });

    const { isActive } = await request.json();

    await prisma.user.update({
      where: { id: resident.userId },
      data: { isActive: !!isActive },
    });

    return NextResponse.json({
      message: isActive
        ? `Portal access granted to ${resident.user.name}`
        : `Portal access revoked for ${resident.user.name}`,
      isActive: !!isActive,
    });
  } catch (error) {
    console.error("toggle-access error:", error);
    return NextResponse.json({ error: "Failed to update access" }, { status: 500 });
  }
}
