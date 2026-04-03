import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// GET: Fetch manager's permissions for all their hostels
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

    // Only admins can view permissions of other managers
    if (!["TENANT_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify manager belongs to this tenant
    const manager = await prisma.user.findFirst({
      where: { id: params.id, tenantId, role: "HOSTEL_MANAGER" },
      select: { id: true, name: true, email: true },
    });
    if (!manager) return NextResponse.json({ error: "Manager not found" }, { status: 404 });

    const assignments = await prisma.managerHostel.findMany({
      where: { userId: params.id },
      include: { hostel: { select: { id: true, name: true, type: true } } },
    });

    return NextResponse.json({
      manager,
      assignments: assignments.map((a) => ({
        hostelId: a.hostelId,
        hostelName: a.hostel.name,
        hostelType: a.hostel.type,
        permissions: JSON.parse(a.permissions || "[]"),
      })),
    });
  } catch (error) {
    console.error("Get permissions error:", error);
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}

// PATCH: Update manager's permissions for a specific hostel
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

    if (!["TENANT_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Only admins can set permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { hostelId, permissions } = body;

    if (!hostelId || !Array.isArray(permissions)) {
      return NextResponse.json({ error: "hostelId and permissions array required" }, { status: 400 });
    }

    // Validate that all permissions are known keys
    const VALID_PERMISSIONS = [
      "billing_view", "billing_manage", "billing_payments",
      "residents_view", "residents_manage", "residents_checkout",
      "rooms_view", "rooms_manage",
      "food_view", "food_manage",
      "expenses_view", "expenses_manage",
      "staff_view", "staff_manage",
      "reports_view",
      "gate_passes_view", "gate_passes_manage",
      "complaints_view", "complaints_manage",
      "notices_view", "notices_manage",
      "meter_readings_view", "meter_readings_manage",
      "visitors_view", "visitors_manage",
    ];
    const filtered = permissions.filter((p: string) => VALID_PERMISSIONS.includes(p));

    // Verify the ManagerHostel record exists and belongs to tenant
    const hostel = await prisma.hostel.findFirst({ where: { id: hostelId, tenantId } });
    if (!hostel) return NextResponse.json({ error: "Hostel not found" }, { status: 404 });

    const updated = await prisma.managerHostel.update({
      where: { userId_hostelId: { userId: params.id, hostelId } },
      data: { permissions: JSON.stringify(filtered) },
    });

    return NextResponse.json({
      message: "Permissions updated",
      hostelId,
      permissions: JSON.parse(updated.permissions),
    });
  } catch (error) {
    console.error("Update permissions error:", error);
    return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 });
  }
}
