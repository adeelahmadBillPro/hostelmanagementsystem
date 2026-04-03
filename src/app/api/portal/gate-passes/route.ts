import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPortalSession } from '@/lib/session';

export async function GET(_request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session || session.user.role !== 'RESIDENT' && session.user.role !== 'STAFF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resident = await prisma.resident.findUnique({
      where: { userId: session.user.id },
      include: { hostel: true },
    });

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    const gatePasses = await prisma.gatePass.findMany({
      where: { residentId: resident.id },
      orderBy: { createdAt: 'desc' },
    });

    const formattedGatePasses = gatePasses.map((g) => ({
      id: g.id,
      leaveDate: g.leaveDate.toISOString(),
      returnDate: g.returnDate.toISOString(),
      actualReturn: g.actualReturn?.toISOString() || null,
      reason: g.reason,
      status: g.status,
      createdAt: g.createdAt.toISOString(),
    }));

    return NextResponse.json({ gatePasses: formattedGatePasses });
  } catch (error) {
    console.error('Failed to fetch gate passes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session || session.user.role !== 'RESIDENT' && session.user.role !== 'STAFF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resident = await prisma.resident.findUnique({
      where: { userId: session.user.id },
      include: { hostel: true },
    });

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    const { leaveDate, returnDate, reason } = await request.json();

    if (!leaveDate || !returnDate || !reason) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const leave = new Date(leaveDate);
    const ret = new Date(returnDate);

    if (ret < leave) {
      return NextResponse.json(
        { error: 'Return date cannot be before leave date' },
        { status: 400 }
      );
    }

    const gatePass = await prisma.gatePass.create({
      data: {
        hostelId: resident.hostelId,
        residentId: resident.id,
        leaveDate: leave,
        returnDate: ret,
        reason,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ gatePass }, { status: 201 });
  } catch (error) {
    console.error('Failed to create gate pass:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
