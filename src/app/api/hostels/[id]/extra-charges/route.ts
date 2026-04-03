import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Your account is not linked to any organization." }, { status: 403 });
    }

    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const extraCharges = await prisma.hostelExtraCharge.findMany({
      where: { hostelId: params.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ extraCharges });
  } catch (error) {
    console.error("Get extra charges error:", error);
    return NextResponse.json({ error: "Failed to fetch extra charges" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Your account is not linked to any organization." }, { status: 403 });
    }

    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, amount, description, applyToAll } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Charge name is required" }, { status: 400 });
    }
    if (typeof amount !== "number" || amount < 0) {
      return NextResponse.json({ error: "Valid amount is required (must be >= 0)" }, { status: 400 });
    }

    const charge = await prisma.hostelExtraCharge.create({
      data: {
        name: name.trim(),
        amount,
        description: description?.trim() || null,
        applyToAll: applyToAll !== false,
        hostelId: params.id,
      },
    });

    return NextResponse.json({ charge }, { status: 201 });
  } catch (error) {
    console.error("Create extra charge error:", error);
    return NextResponse.json({ error: "Failed to create extra charge" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Your account is not linked to any organization." }, { status: 403 });
    }

    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const body = await request.json();
    const { id, name, amount, isActive, description } = body;

    if (!id) {
      return NextResponse.json({ error: "Charge ID is required" }, { status: 400 });
    }

    const existing = await prisma.hostelExtraCharge.findFirst({
      where: { id, hostelId: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Extra charge not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (amount !== undefined) {
      if (typeof amount !== "number" || amount < 0) {
        return NextResponse.json({ error: "Valid amount is required (must be >= 0)" }, { status: 400 });
      }
      updateData.amount = amount;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (description !== undefined) updateData.description = description?.trim() || null;

    const updated = await prisma.hostelExtraCharge.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ charge: updated });
  } catch (error) {
    console.error("Update extra charge error:", error);
    return NextResponse.json({ error: "Failed to update extra charge" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Your account is not linked to any organization." }, { status: 403 });
    }

    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const chargeId = searchParams.get("chargeId");
    if (!chargeId) {
      return NextResponse.json({ error: "chargeId query param is required" }, { status: 400 });
    }

    const existing = await prisma.hostelExtraCharge.findFirst({
      where: { id: chargeId, hostelId: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Extra charge not found" }, { status: 404 });
    }

    await prisma.hostelExtraCharge.delete({ where: { id: chargeId } });

    return NextResponse.json({ message: "Extra charge deleted successfully" });
  } catch (error) {
    console.error("Delete extra charge error:", error);
    return NextResponse.json({ error: "Failed to delete extra charge" }, { status: 500 });
  }
}
