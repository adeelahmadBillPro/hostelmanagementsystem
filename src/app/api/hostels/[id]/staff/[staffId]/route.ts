import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; staffId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: params.staffId, hostelId: params.id },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    return NextResponse.json({ staff });
  } catch (error) {
    console.error('Failed to fetch staff:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; staffId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.cnic !== undefined) updateData.cnic = body.cnic;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.staffType !== undefined) updateData.staffType = body.staffType;
    if (body.shift !== undefined) updateData.shift = body.shift;
    if (body.salary !== undefined) updateData.salary = parseFloat(body.salary);
    if (body.joiningDate !== undefined) updateData.joiningDate = new Date(body.joiningDate);
    if (body.emergencyContact !== undefined) updateData.emergencyContact = body.emergencyContact;
    if (body.emergencyPhone !== undefined) updateData.emergencyPhone = body.emergencyPhone;
    if (body.status !== undefined) updateData.status = body.status;

    const staff = await prisma.staff.update({
      where: { id: params.staffId, hostelId: params.id },
      data: updateData,
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error('Failed to update staff:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; staffId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.staff.delete({
      where: { id: params.staffId, hostelId: params.id },
    });

    return NextResponse.json({ message: 'Staff deleted successfully' });
  } catch (error) {
    console.error('Failed to delete staff:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
