import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const body = await request.json();

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.price !== undefined) updateData.price = parseFloat(body.price);
  if (body.maxHostels !== undefined) updateData.maxHostels = parseInt(body.maxHostels);
  if (body.maxResidents !== undefined) updateData.maxResidents = parseInt(body.maxResidents);
  if (body.features !== undefined) updateData.features = body.features;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  const updated = await prisma.subscriptionPlan.update({
    where: { id },
    data: updateData,
    include: {
      _count: { select: { tenants: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
    include: { _count: { select: { tenants: true } } },
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  if (plan._count.tenants > 0) {
    return NextResponse.json(
      { error: "Cannot delete a plan that has active tenants. Reassign tenants first." },
      { status: 400 }
    );
  }

  await prisma.subscriptionPlan.delete({ where: { id } });

  return NextResponse.json({ message: "Plan deleted successfully" });
}
