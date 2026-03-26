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

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    const hostelId = params.id;

    let dateFilter = {};
    if (dateStr) {
      const date = new Date(dateStr);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      dateFilter = {
        timeIn: { gte: startOfDay, lte: endOfDay },
      };
    }

    const visitors = await prisma.visitor.findMany({
      where: {
        hostelId,
        ...dateFilter,
      },
      include: {
        resident: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { timeIn: 'desc' },
    });

    const formattedVisitors = visitors.map((v: any) => ({
      id: v.id,
      name: v.name,
      cnic: v.cnic,
      phone: v.phone,
      purpose: v.purpose,
      residentName: v.resident?.user?.name || 'Unknown',
      residentId: v.residentId,
      timeIn: v.timeIn.toISOString(),
      timeOut: v.timeOut?.toISOString() || null,
    }));

    const residents = await prisma.resident.findMany({
      where: { hostelId, status: 'ACTIVE' },
      include: {
        user: { select: { name: true } },
        bed: {
          include: { room: { select: { roomNumber: true } } },
        },
      },
    });

    const formattedResidents = residents.map((r: any) => ({
      id: r.id,
      name: r.user?.name || 'Unknown',
      roomNumber: r.bed?.room?.roomNumber || 'N/A',
    }));

    return NextResponse.json({
      visitors: formattedVisitors,
      residents: formattedResidents,
    });
  } catch (error) {
    console.error('Failed to fetch visitors:', error);
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
    const { name, cnic, phone, purpose, residentId } = body;

    if (!name || !cnic || !phone || !purpose || !residentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const visitor = await prisma.visitor.create({
      data: {
        hostelId: params.id,
        name,
        cnic,
        phone,
        purpose,
        residentId,
        timeIn: new Date(),
      },
    });

    return NextResponse.json({ visitor }, { status: 201 });
  } catch (error) {
    console.error('Failed to create visitor:', error);
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

    const { visitorId } = await request.json();

    if (!visitorId) {
      return NextResponse.json({ error: 'Visitor ID is required' }, { status: 400 });
    }

    const visitor = await prisma.visitor.update({
      where: { id: visitorId, hostelId: params.id },
      data: { timeOut: new Date() },
    });

    return NextResponse.json({ visitor });
  } catch (error) {
    console.error('Failed to mark visitor out:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
