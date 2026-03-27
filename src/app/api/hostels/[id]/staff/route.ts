import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { rateLimit } from "@/lib/rate-limit";
import { staffSchema } from "@/lib/validations";

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

    const parsed = staffSchema.safeParse(body);
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
    const { emergencyContact, emergencyPhone } = body;

    const staff = await prisma.staff.create({
      data: {
        hostelId,
        name,
        cnic,
        phone,
        address,
        staffType,
        shift,
        salary,
        joiningDate: new Date(joiningDate),
        emergencyContact: emergencyContact || null,
        emergencyPhone: emergencyPhone || null,
        isActive: true,
      },
    });

    return NextResponse.json({ staff }, { status: 201 });
  } catch (error) {
    console.error('Failed to create staff:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
