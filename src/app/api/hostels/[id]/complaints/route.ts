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
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { hostelId: params.id };
    if (status) {
      where.status = status;
    }

    const complaints = await prisma.complaint.findMany({
      where,
      include: {
        resident: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedComplaints = complaints.map((c: any) => ({
      id: c.id,
      category: c.category,
      description: c.description,
      residentName: c.resident?.user?.name || 'Unknown',
      residentId: c.residentId,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json({ complaints: formattedComplaints });
  } catch (error) {
    console.error('Failed to fetch complaints:', error);
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
    const { category, description, residentId } = body;

    if (!category || !description || !residentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const complaint = await prisma.complaint.create({
      data: {
        hostelId: params.id,
        residentId,
        category,
        description,
        status: 'OPEN',
      },
    });

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error) {
    console.error('Failed to create complaint:', error);
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

    const { complaintId, status } = await request.json();

    if (!complaintId || !status) {
      return NextResponse.json({ error: 'Complaint ID and status are required' }, { status: 400 });
    }

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const complaint = await prisma.complaint.update({
      where: { id: complaintId, hostelId: params.id },
      data: {
        status,
        resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
      },
    });

    return NextResponse.json({ complaint });
  } catch (error) {
    console.error('Failed to update complaint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
