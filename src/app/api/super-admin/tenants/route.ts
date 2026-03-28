import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { validateName, validateEmail, validatePhone } from "@/lib/validate";

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

  // Validate tenant name
  const nameCheck = validateName(name, "Tenant name");
  if (!nameCheck.valid) {
    return NextResponse.json({ error: nameCheck.error }, { status: 400 });
  }

  // Validate email format
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) {
    return NextResponse.json({ error: emailCheck.error }, { status: 400 });
  }

  // Validate phone if provided
  if (phone) {
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
    }
  }

  const existing = await prisma.tenant.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A tenant with this email already exists" },
      { status: 409 }
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  // Generate password for tenant admin
  const { randomBytes } = require("crypto");
  const bcrypt = require("bcryptjs");
  const defaultPassword = randomBytes(4).toString("hex");
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const result = await prisma.$transaction(async (tx: any) => {
    // Create tenant
    // Set trial period based on plan
    let trialEndsAt = null;
    let isTrial = true;
    if (planId) {
      const selectedPlan = await tx.subscriptionPlan.findUnique({ where: { id: planId } });
      if (selectedPlan && selectedPlan.trialDays > 0) {
        trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + selectedPlan.trialDays);
      } else if (selectedPlan && selectedPlan.price > 0) {
        isTrial = false; // Paid plan, no trial
      }
    } else {
      // No plan selected - give 14-day trial
      trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);
    }

    const tenant = await tx.tenant.create({
      data: {
        name,
        email,
        phone: phone || null,
        planId: planId || null,
        isTrial,
        trialEndsAt,
        planStartedAt: new Date(),
      },
    });

    // Create TENANT_ADMIN user account
    await tx.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: hashedPassword,
        role: "TENANT_ADMIN",
        tenantId: tenant.id,
      },
    });

    // Re-fetch with includes
    return await tx.tenant.findUnique({
      where: { id: tenant.id },
      include: {
        plan: { select: { id: true, name: true } },
        _count: { select: { hostels: true, users: true } },
      },
    });
  });

  return NextResponse.json({
    ...result,
    loginCredentials: {
      email,
      password: defaultPassword,
      message: "Share these credentials with the tenant so they can login",
    },
  }, { status: 201 });
}
