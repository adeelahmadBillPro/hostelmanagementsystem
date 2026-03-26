import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'RESIDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resident = await prisma.resident.findUnique({
      where: { userId: session.user.id },
      include: { hostel: true },
    });

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    const complaints = await prisma.complaint.findMany({
      where: { residentId: resident.id },
      orderBy: { createdAt: 'desc' },
    });

    const formattedComplaints = complaints.map((c) => ({
      id: c.id,
      category: c.category,
      description: c.description,
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

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'RESIDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resident = await prisma.resident.findUnique({
      where: { userId: session.user.id },
      include: { hostel: true },
    });

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    const { category, description } = await request.json();

    if (!category || !description) {
      return NextResponse.json({ error: 'Category and description are required' }, { status: 400 });
    }

    const complaint = await prisma.complaint.create({
      data: {
        hostelId: resident.hostelId,
        residentId: resident.id,
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
