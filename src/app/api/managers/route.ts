import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { rateLimit } from "@/lib/rate-limit";
import { validatePassword, validateName, validatePhone } from "@/lib/validate";

export async function GET() {
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
    const managers = await prisma.user.findMany({
      where: {
        tenantId,
        role: "HOSTEL_MANAGER",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        managerHostels: {
          include: {
            hostel: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    const result = managers.map((manager) => ({
      id: manager.id,
      name: manager.name,
      email: manager.email,
      phone: manager.phone,
      createdAt: manager.createdAt,
      assignedHostels: manager.managerHostels.map((mh) => mh.hostel),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Fetch managers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch managers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "standard");
  if (limited) return limited;

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
    const body = await request.json();
    const { name, email, phone, salary, hostelIds } = body;
    // Auto-generate password if not provided
    const password = body.password || randomBytes(4).toString("hex");

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Validate name
    const nameCheck = validateName(name, "Manager name");
    if (!nameCheck.valid) {
      return NextResponse.json({ error: nameCheck.error }, { status: 400 });
    }

    // Validate password strength (only if user provided one)
    if (body.password) {
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) {
        return NextResponse.json({ error: pwCheck.error }, { status: 400 });
      }
    }

    // Validate phone if provided
    if (phone) {
      const phoneCheck = validatePhone(phone);
      if (!phoneCheck.valid) {
        return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
      }
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Verify hostel IDs belong to tenant
    if (hostelIds && hostelIds.length > 0) {
      const validHostels = await prisma.hostel.count({
        where: { id: { in: hostelIds }, tenantId },
      });
      if (validHostels !== hostelIds.length) {
        return NextResponse.json(
          { error: "One or more hostels are invalid" },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const manager = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: hashedPassword,
        salary: parseFloat(salary) || 0,
        role: "HOSTEL_MANAGER",
        tenantId,
        managerHostels: {
          create:
            hostelIds && hostelIds.length > 0
              ? hostelIds.map((hostelId: string) => ({ hostelId }))
              : [],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        managerHostels: {
          include: {
            hostel: {
              select: { id: true, name: true, type: true },
            },
          },
        },
      },
    });

    const result = {
      id: manager.id,
      name: manager.name,
      email: manager.email,
      phone: manager.phone,
      createdAt: manager.createdAt,
      assignedHostels: manager.managerHostels.map((mh) => mh.hostel),
    };

    return NextResponse.json({
      ...result,
      loginCredentials: {
        email,
        password,
        message: "Share these credentials with the manager",
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Create manager error:", error);
    return NextResponse.json(
      { error: "Failed to create manager" },
      { status: 500 }
    );
  }
}
