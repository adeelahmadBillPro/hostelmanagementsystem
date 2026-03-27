import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
  }

  if (session.user.role !== "TENANT_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
  }

  if (session.user.role !== "TENANT_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, phone, password, hostelIds } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
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

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create manager error:", error);
    return NextResponse.json(
      { error: "Failed to create manager" },
      { status: 500 }
    );
  }
}
