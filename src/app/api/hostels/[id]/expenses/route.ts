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
    const category = searchParams.get('category');

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const where: Record<string, unknown> = {
      hostelId: params.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (category) {
      where.categoryId = category;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        createdBy: {
          select: { name: true },
        },
        category: true,
      },
      orderBy: { date: 'desc' },
    });

    const formattedExpenses = expenses.map((e: any) => ({
      id: e.id,
      date: e.date.toISOString(),
      category: e.category?.name || 'Unknown',
      description: e.description,
      amount: e.amount,
      receiptUrl: e.receiptUrl,
      addedBy: e.createdBy?.name || 'Unknown',
    }));

    return NextResponse.json({ expenses: formattedExpenses });
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
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
    const { categoryId, amount, date, description, receiptUrl } = body;

    if (!categoryId || !amount || !date || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        hostelId: params.id,
        createdById: session.user.id,
        categoryId,
        amount: parseFloat(amount),
        date: new Date(date),
        description,
        receiptUrl: receiptUrl || null,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error('Failed to create expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get('expenseId');

    if (!expenseId) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    await prisma.expense.delete({
      where: { id: expenseId, hostelId: params.id },
    });

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
