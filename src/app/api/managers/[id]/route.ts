import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(
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

  if (session.user.role !== "TENANT_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Verify manager belongs to tenant
    const existing = await prisma.user.findFirst({
      where: { id: params.id, tenantId, role: "HOSTEL_MANAGER" },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Manager not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, phone, hostelIds } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    // Update user basic info
    await prisma.user.update({
      where: { id: params.id },
      data: updateData,
    });

    // Update hostel assignments if provided
    if (hostelIds !== undefined) {
      // Verify hostel IDs belong to tenant
      if (hostelIds.length > 0) {
        const validHostels = await prisma.hostel.count({
          where: { id: { in: hostelIds }, tenantId },
        });
        if (validHostels !== hostelIds.length) {
          return NextResponse.json(
            { error: "One or more hostels are invalid" },
            { status: 400 }
          );
        }
      }

      // Delete existing assignments and create new ones
      await prisma.managerHostel.deleteMany({
        where: { userId: params.id },
      });

      if (hostelIds.length > 0) {
        await prisma.managerHostel.createMany({
          data: hostelIds.map((hostelId: string) => ({
            userId: params.id,
            hostelId,
          })),
        });
      }
    }

    // Fetch updated manager
    const manager = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        managerHostels: {
          include: {
            hostel: {
              select: { id: true, name: true, type: true },
            },
          },
        },
      },
    });

    if (!manager) {
      return NextResponse.json(
        { error: "Manager not found" },
        { status: 404 }
      );
    }

    const result = {
      id: manager.id,
      name: manager.name,
      email: manager.email,
      phone: manager.phone,
      createdAt: manager.createdAt,
      assignedHostels: manager.managerHostels.map((mh) => mh.hostel),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Update manager error:", error);
    return NextResponse.json(
      { error: "Failed to update manager" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

  if (session.user.role !== "TENANT_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { id: params.id, tenantId, role: "HOSTEL_MANAGER" },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Manager not found" },
        { status: 404 }
      );
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Manager deleted successfully" });
  } catch (error) {
    console.error("Delete manager error:", error);
    return NextResponse.json(
      { error: "Failed to delete manager" },
      { status: 500 }
    );
  }
}
