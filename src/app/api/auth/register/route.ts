import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  try {
    const body = await req.json();
    const { name, email, phone, password } = body;

    if (!name || !email || !password || !phone) {
      return NextResponse.json(
        { error: "Name, email, phone, and password are required" },
        { status: 400 }
      );
    }

    // Validate name
    if (name.trim().length < 3) {
      return NextResponse.json({ error: "Name must be at least 3 characters" }, { status: 400 });
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Validate phone (+92 format, 12 digits)
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 12 || !cleanPhone.startsWith("923")) {
      return NextResponse.json({ error: "Phone must be a valid Pakistani number (+92 3XX XXXXXXX)" }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one uppercase letter" }, { status: 400 });
    }
    if (!/[a-z]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one lowercase letter" }, { status: 400 });
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one number" }, { status: 400 });
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one special character" }, { status: 400 });
    }

    // Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Find or create free trial plan
    let trialPlan = await prisma.subscriptionPlan.findFirst({
      where: { name: "Free Trial", isActive: true },
    });
    if (!trialPlan) {
      trialPlan = await prisma.subscriptionPlan.create({
        data: {
          name: "Free Trial",
          price: 0,
          maxHostels: 1,
          maxResidents: 20,
          maxRooms: 50,
          maxStaff: 5,
          trialDays: 14,
          features: ["rooms", "residents", "billing", "food", "complaints"],
          sortOrder: 0,
        },
      });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + (trialPlan.trialDays || 14));

    // Create tenant and user together
    const tenant = await prisma.tenant.create({
      data: {
        name: `${name}'s Organization`,
        email,
        phone: "+" + cleanPhone,
        planId: trialPlan.id,
        isTrial: true,
        trialEndsAt,
        planStartedAt: new Date(),
        users: {
          create: {
            name,
            email,
            phone,
            password: hashedPassword,
            role: "TENANT_ADMIN",
          },
        },
      },
      include: {
        users: true,
      },
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        userId: tenant.users[0].id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
