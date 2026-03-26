import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gatePasses = await prisma.gatePass.findMany({
      where: { hostelId: params.id },
      include: {
        resident: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedGatePasses = gatePasses.map((g: any) => ({
      id: g.id,
      residentName: g.resident?.user?.name || 'Unknown',
      residentId: g.residentId,
      leaveDate: g.leaveDate.toISOString(),
      returnDate: g.returnDate.toISOString(),
      actualReturn: g.actualReturn?.toISOString() || null,
      reason: g.reason,
      status: g.status,
    }));

    return NextResponse.json({ gatePasses: formattedGatePasses });
  } catch (error) {
    console.error('Failed to fetch gate passes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { residentId, leaveDate, returnDate, reason } = body;

    if (!residentId || !leaveDate || !returnDate || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const gatePass = await prisma.gatePass.create({
      data: {
        hostelId: params.id,
        residentId,
        leaveDate: new Date(leaveDate),
        returnDate: new Date(returnDate),
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gatePassId, action } = await request.json();

    if (!gatePassId || !action) {
      return NextResponse.json({ error: 'Gate pass ID and action are required' }, { status: 400 });
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'APPROVE':
        updateData = { status: 'APPROVED', approvedAt: new Date() };
        break;
      case 'REJECT':
        updateData = { status: 'REJECTED' };
        break;
      case 'RETURN':
        updateData = { status: 'RETURNED', actualReturn: new Date() };
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const gatePass = await prisma.gatePass.update({
      where: { id: gatePassId, hostelId: params.id },
      data: updateData,
    });

    return NextResponse.json({ gatePass });
  } catch (error) {
    console.error('Failed to update gate pass:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
