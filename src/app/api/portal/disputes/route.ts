import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPortalSession } from '@/lib/session';

export async function GET(_request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session || session.user.role !== 'RESIDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resident = await prisma.resident.findUnique({
      where: { userId: session.user.id },
    });

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    const disputes = await prisma.billDispute.findMany({
      where: { residentId: resident.id },
      include: {
        bill: {
          select: { month: true, year: true, totalAmount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedDisputes = disputes.map((d: any) => ({
      id: d.id,
      category: d.category,
      description: d.description,
      itemDate: d.itemDate?.toISOString() || null,
      itemId: d.itemId,
      status: d.status,
      resolution: d.resolution,
      adjustedAmount: d.adjustedAmount,
      billMonth: d.bill.month,
      billYear: d.bill.year,
      billTotal: d.bill.totalAmount,
      createdAt: d.createdAt.toISOString(),
    }));

    return NextResponse.json({ disputes: formattedDisputes });
  } catch (error) {
    console.error('Failed to fetch disputes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session || session.user.role !== 'RESIDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resident = await prisma.resident.findUnique({
      where: { userId: session.user.id },
    });

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    const { billId, category, description, itemDate, itemId } = await request.json();

    if (!billId || !category || !description) {
      return NextResponse.json(
        { error: 'billId, category, and description are required' },
        { status: 400 }
      );
    }

    const validCategories = ['food', 'electricity', 'parking', 'room_rent', 'other'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify the bill belongs to this resident
    const bill = await prisma.monthlyBill.findUnique({
      where: { id: billId },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    if (bill.residentId !== resident.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create the dispute
    const dispute = await prisma.billDispute.create({
      data: {
        category,
        description,
        itemDate: itemDate ? new Date(itemDate) : null,
        itemId: itemId || null,
        residentId: resident.id,
        billId,
      },
    });

    // Mark bill as disputed
    await prisma.monthlyBill.update({
      where: { id: billId },
      data: { isDisputed: true },
    });

    return NextResponse.json(
      {
        dispute: {
          id: dispute.id,
          category: dispute.category,
          description: dispute.description,
          status: dispute.status,
          createdAt: dispute.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create dispute:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
