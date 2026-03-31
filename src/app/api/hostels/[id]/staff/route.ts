import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { rateLimit } from "@/lib/rate-limit";
import { staffSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hostelId = params.id;

    const staff = await prisma.staff.findMany({
      where: { hostelId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error('Failed to fetch staff:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hostelId = params.id;
    const body = await request.json();

    const parsed = staffSchema.safeParse({
      ...body,
      salary: Number(body.salary) || 0,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const {
      name,
      cnic,
      phone,
      address,
      staffType,
      shift,
      salary,
      joiningDate,
    } = parsed.data;
    // Fields extracted below with email

    // Validate CNIC - reject dummy/repeated digits
    if (cnic) {
      const cleanCnic = cnic.replace(/\D/g, "");
      if (cleanCnic.length !== 13) {
        return NextResponse.json({ error: "CNIC must be exactly 13 digits" }, { status: 400 });
      }
      // Reject all same digits (11111111111111, 22222222222222, etc.)
      if (/^(\d)\1{12}$/.test(cleanCnic)) {
        return NextResponse.json({ error: "Please enter a valid CNIC number, not repeated digits" }, { status: 400 });
      }
      // Check duplicate CNIC in same hostel
      const existingStaff = await prisma.staff.findFirst({
        where: { hostelId, cnic: cleanCnic, isActive: true },
      });
      if (existingStaff) {
        return NextResponse.json({ error: `Staff with this CNIC already exists: ${existingStaff.name}` }, { status: 400 });
      }
    }

    // Validate phone
    if (phone && phone.length === 11 && /^(\d)\1{10}$/.test(phone)) {
      return NextResponse.json({ error: "Please enter a valid phone number" }, { status: 400 });
    }

    const { email: staffEmail, emergencyContact, emergencyPhone, freeAccommodation, roomNumber, freeFood, foodAllowance } = parsed.data as any;

    const staff = await prisma.staff.create({
      data: {
        hostelId,
        name,
        cnic,
        phone,
        email: staffEmail || null,
        address,
        staffType,
        shift,
        salary,
        joiningDate: new Date(joiningDate),
        emergencyContact: emergencyContact || null,
        emergencyPhone: emergencyPhone || null,
        freeAccommodation: !!freeAccommodation,
        roomNumber: roomNumber || null,
        freeFood: !!freeFood,
        foodAllowance: Number(foodAllowance) || 0,
        isActive: true,
      },
    });

    // Create a User account so staff can log into the portal
    let credentials = null;
    if (staffEmail) {
      const existingUser = await prisma.user.findUnique({ where: { email: staffEmail } });
      if (!existingUser) {
        const defaultPassword = randomBytes(4).toString("hex");
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        await prisma.user.create({
          data: {
            name,
            email: staffEmail,
            phone: phone || null,
            cnic: cnic || null,
            password: hashedPassword,
            role: "STAFF",
            hostelId,
          },
        });
        credentials = { email: staffEmail, password: defaultPassword };
      }
    }

    return NextResponse.json({ staff, credentials }, { status: 201 });
  } catch (error) {
    console.error('Failed to create staff:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
