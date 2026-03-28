import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const hostelId = params.id;
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) {
      return NextResponse.json({ error: "The requested item was not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Prisma.ResidentWhereInput = { hostelId };

    if (status && status !== "ALL") {
      where.status = status as any;
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { cnic: { contains: search.replace(/[-\s]/g, ""), mode: "insensitive" } } },
        { room: { roomNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    const residents = await prisma.resident.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            cnic: true,
            image: true,
          },
        },
        room: {
          select: {
            id: true,
            roomNumber: true,
            type: true,
            rentPerBed: true,
            floor: {
              select: {
                id: true,
                name: true,
                floorNumber: true,
                building: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        bed: {
          select: { id: true, bedNumber: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Stats
    const totalResidents = await prisma.resident.count({ where: { hostelId } });
    const activeResidents = await prisma.resident.count({
      where: { hostelId, status: "ACTIVE" },
    });
    const checkedOutResidents = await prisma.resident.count({
      where: { hostelId, status: "CHECKED_OUT" },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthlyPayments = await prisma.payment.aggregate({
      where: {
        hostelId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    });

    return NextResponse.json({
      residents,
      stats: {
        totalResidents,
        activeResidents,
        checkedOutResidents,
        monthlyCollection: monthlyPayments._sum.amount || 0,
      },
    });
  } catch (error) {
    console.error("GET residents error:", error);
    return NextResponse.json(
      { error: "Failed to fetch residents" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = rateLimit(request, "standard");
  if (limited) return limited;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const hostelId = params.id;
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) {
      return NextResponse.json({ error: "The requested item was not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      cnic,
      gender,
      institution,
      bloodGroup,
      medicalCondition,
      emergencyContact,
      emergencyPhone,
      roomId,
      bedId,
      advancePaid,
      securityDeposit,
      foodPlan,
      customFoodFee,
      moveInDate,
    } = body;

    // Check plan limits
    const { canAddResident } = require("@/lib/plan-limits");
    const limitCheck = await canAddResident(session.user.tenantId!, hostelId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
    }

    // Validate required fields
    if (!name || !email || !roomId || !bedId || !moveInDate) {
      return NextResponse.json(
        { error: "Name, email, room, bed, and move-in date are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Check bed is available
    const bed = await prisma.bed.findFirst({
      where: { id: bedId, roomId, status: "VACANT" },
    });
    if (!bed) {
      return NextResponse.json(
        { error: "Selected bed is not available" },
        { status: 400 }
      );
    }

    // Generate secure random default password
    const defaultPassword = randomBytes(4).toString("hex"); // Random 8-char password
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create user + resident + update bed in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          phone: phone || null,
          cnic: cnic ? cnic.replace(/\D/g, "") : null,
          password: hashedPassword,
          role: "RESIDENT",
          tenantId: session.user.tenantId!,
          hostelId,
        },
      });

      const resident = await tx.resident.create({
        data: {
          userId: user.id,
          hostelId,
          roomId,
          bedId,
          moveInDate: new Date(moveInDate),
          advancePaid: parseFloat(advancePaid) || 0,
          securityDeposit: parseFloat(securityDeposit) || 0,
          foodPlan: foodPlan || "FULL_MESS",
          customFoodFee: parseFloat(customFoodFee) || 0,
          status: "ACTIVE",
          gender: gender || null,
          institution: institution || null,
          bloodGroup: bloodGroup || null,
          medicalCondition: medicalCondition || null,
          emergencyContact: emergencyContact || null,
          emergencyPhone: emergencyPhone || null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              cnic: true,
            },
          },
          room: { select: { id: true, roomNumber: true } },
          bed: { select: { id: true, bedNumber: true } },
        },
      });

      await tx.bed.update({
        where: { id: bedId },
        data: { status: "OCCUPIED" },
      });

      return resident;
    });

    return NextResponse.json({
      ...result,
      loginCredentials: {
        email,
        password: defaultPassword,
        message: "Share these credentials with the resident so they can login to the portal",
      },
    }, { status: 201 });
  } catch (error) {
    console.error("POST resident error:", error);
    return NextResponse.json(
      { error: "Failed to create resident" },
      { status: 500 }
    );
  }
}
