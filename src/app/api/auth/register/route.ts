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

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
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
        phone,
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
