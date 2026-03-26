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
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const records = await prisma.staffSalary.findMany({
      where: {
        staff: { hostelId: params.id },
        month,
        year,
      },
      include: {
        staff: {
          select: { name: true, staffType: true },
        },
      },
      orderBy: { staff: { name: 'asc' } },
    });

    const formattedRecords = records.map((r: any) => ({
      id: r.id,
      staffId: r.staffId,
      staffName: r.staff.name,
      staffType: r.staff.staffType,
      baseSalary: r.amount,
      bonus: r.bonus,
      deduction: r.deduction,
      netAmount: r.netAmount,
      status: r.isPaid ? 'PAID' : 'UNPAID',
      month: r.month,
      year: r.year,
    }));

    return NextResponse.json({ records: formattedRecords });
  } catch (error) {
    console.error('Failed to fetch salary records:', error);
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

    const { month, year } = await request.json();

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
    }

    const existingRecords = await prisma.staffSalary.findMany({
      where: {
        staff: { hostelId: params.id },
        month,
        year,
      },
    });

    if (existingRecords.length > 0) {
      return NextResponse.json(
        { error: 'Salary sheet already generated for this month' },
        { status: 400 }
      );
    }

    const activeStaff = await prisma.staff.findMany({
      where: { hostelId: params.id, isActive: true },
    });

    const records = await Promise.all(
      activeStaff.map((staff: any) =>
        prisma.staffSalary.create({
          data: {
            staffId: staff.id,
            month,
            year,
            amount: staff.salary,
            bonus: 0,
            deduction: 0,
            netAmount: staff.salary,
            isPaid: false,
          },
        })
      )
    );

    return NextResponse.json({ records, count: records.length }, { status: 201 });
  } catch (error) {
    console.error('Failed to generate salary sheet:', error);
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

    const { recordId, status, bonus, deduction } = await request.json();

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    const record = await prisma.staffSalary.findUnique({
      where: { id: recordId },
      include: { staff: true },
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) {
      updateData.isPaid = status === 'PAID';
      if (status === 'PAID') {
        updateData.paidDate = new Date();
      }
    }
    if (bonus !== undefined) {
      updateData.bonus = parseFloat(bonus);
      updateData.netAmount = record.amount + parseFloat(bonus) - (deduction !== undefined ? parseFloat(deduction) : record.deduction);
    }
    if (deduction !== undefined) {
      updateData.deduction = parseFloat(deduction);
      updateData.netAmount = record.amount + (bonus !== undefined ? parseFloat(bonus) : record.bonus) - parseFloat(deduction);
    }

    const updated = await prisma.staffSalary.update({
      where: { id: recordId },
      data: updateData,
    });

    return NextResponse.json({ record: updated });
  } catch (error) {
    console.error('Failed to update salary record:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
