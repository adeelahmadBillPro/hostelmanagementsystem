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
      include: {
        buildings: {
          include: {
            floors: {
              include: {
                rooms: {
                  include: { beds: true },
                },
              },
            },
          },
        },
        residents: {
          where: { status: "ACTIVE" },
          select: { id: true },
        },
        _count: {
          select: {
            residents: true,
            buildings: true,
            staff: true,
          },
        },
      },
    });

    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    return NextResponse.json(hostel);
  } catch (error) {
    console.error("Get hostel error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hostel" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

  if (session.user.role !== "TENANT_ADMIN") {
    return NextResponse.json({ error: "You don't have permission for this action" }, { status: 403 });
  }

  try {
    // Verify hostel belongs to tenant
    const existing = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, type, address, city, contact, status } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) {
      if (!["GOVERNMENT", "UNIVERSITY", "PRIVATE"].includes(type)) {
        return NextResponse.json(
          { error: "Invalid hostel type" },
          { status: 400 }
        );
      }
      updateData.type = type;
    }
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (contact !== undefined) updateData.contact = contact;
    // Billing settings
    if (body.billingCycle !== undefined) {
      if (["WEEKLY", "BIWEEKLY", "MONTHLY"].includes(body.billingCycle)) {
        updateData.billingCycle = body.billingCycle;
      }
    }
    if (body.fixedFoodCharge !== undefined) updateData.fixedFoodCharge = parseFloat(body.fixedFoodCharge) || 0;
    if (body.billingDueDays !== undefined) updateData.billingDueDays = parseInt(body.billingDueDays) || 7;
    if (body.lateFeePercent !== undefined) updateData.lateFeePercent = parseFloat(body.lateFeePercent) || 0;
    if (status !== undefined) {
      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    const hostel = await prisma.hostel.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(hostel);
  } catch (error) {
    console.error("Update hostel error:", error);
    return NextResponse.json(
      { error: "Failed to update hostel" },
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
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Your account is not linked to any organization. Please contact support." }, { status: 403 });
  }

  if (session.user.role !== "TENANT_ADMIN") {
    return NextResponse.json({ error: "You don't have permission for this action" }, { status: 403 });
  }

  try {
    const existing = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    await prisma.hostel.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Hostel deleted successfully" });
  } catch (error) {
    console.error("Delete hostel error:", error);
    return NextResponse.json(
      { error: "Failed to delete hostel" },
      { status: 500 }
    );
  }
}
