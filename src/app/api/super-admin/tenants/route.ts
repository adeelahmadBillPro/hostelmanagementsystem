import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      plan: { select: { id: true, name: true } },
      _count: { select: { hostels: true, users: true } },
    },
  });

  return NextResponse.json(tenants);
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "standard");
  if (limited) return limited;

  const session = await getSession();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
  }

  const body = await request.json();
  const { name, email, phone, planId } = body;

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.tenant.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A tenant with this email already exists" },
      { status: 409 }
    );
  }

  const tenant = await prisma.tenant.create({
    data: {
      name,
      email,
      phone: phone || null,
      planId: planId || null,
    },
    include: {
      plan: { select: { id: true, name: true } },
      _count: { select: { hostels: true, users: true } },
    },
  });

  return NextResponse.json(tenant, { status: 201 });
}
