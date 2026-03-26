import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { price: "asc" },
    include: {
      _count: { select: { tenants: true } },
    },
  });

  return NextResponse.json(plans);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, price, maxHostels, maxResidents, features } = body;

  if (!name || price === undefined || !maxHostels || !maxResidents) {
    return NextResponse.json(
      { error: "Name, price, maxHostels, and maxResidents are required" },
      { status: 400 }
    );
  }

  const plan = await prisma.subscriptionPlan.create({
    data: {
      name,
      price: parseFloat(price),
      maxHostels: parseInt(maxHostels),
      maxResidents: parseInt(maxResidents),
      features: Array.isArray(features) ? features : [],
    },
    include: {
      _count: { select: { tenants: true } },
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
