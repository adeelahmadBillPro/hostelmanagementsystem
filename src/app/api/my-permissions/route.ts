import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// GET: Manager fetches their own permissions for a specific hostel
// Usage: /api/my-permissions?hostelId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const hostelId = searchParams.get("hostelId");

    if (!hostelId) {
      return NextResponse.json({ error: "hostelId required" }, { status: 400 });
    }

    // Admins have all permissions implicitly
    if (["TENANT_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ permissions: null, isAdmin: true });
    }

    if (session.user.role !== "HOSTEL_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assignment = await prisma.managerHostel.findUnique({
      where: { userId_hostelId: { userId: session.user.id, hostelId } },
      select: { permissions: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Not assigned to this hostel" }, { status: 403 });
    }

    const permissions: string[] = JSON.parse(assignment.permissions || "[]");
    return NextResponse.json({ permissions, isAdmin: false });
  } catch (error) {
    console.error("my-permissions error:", error);
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}
