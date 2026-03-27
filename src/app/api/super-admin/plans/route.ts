import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { subscriptionPlanSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
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
  const limited = rateLimit(request, "standard");
  if (limited) return limited;

  const session = await getSession();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = subscriptionPlanSchema.safeParse({
    ...body,
    price: Number(body.price) || 0,
    maxHostels: Number(body.maxHostels) || 1,
    maxResidents: Number(body.maxResidents) || 1,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, price, maxHostels, maxResidents, features } = parsed.data;

  const plan = await prisma.subscriptionPlan.create({
    data: {
      name,
      price,
      maxHostels,
      maxResidents,
      features,
    },
    include: {
      _count: { select: { tenants: true } },
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
