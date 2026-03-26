import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
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

    // Create tenant and user together
    const tenant = await prisma.tenant.create({
      data: {
        name: `${name}'s Organization`,
        email,
        phone,
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
