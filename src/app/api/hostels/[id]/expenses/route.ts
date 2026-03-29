import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { rateLimit } from "@/lib/rate-limit";
import { expenseSchema } from "@/lib/validations";

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

    // Stats
    const totalExpenses = formattedExpenses.reduce((s: number, e: any) => s + e.amount, 0);
    const categories = [...new Set(formattedExpenses.map((e: any) => e.category))];
    const categoryTotals = categories.map((cat) => ({
      name: cat,
      total: formattedExpenses.filter((e: any) => e.category === cat).reduce((s: number, e: any) => s + e.amount, 0),
    })).sort((a, b) => b.total - a.total);

    return NextResponse.json({
      expenses: formattedExpenses,
      stats: {
        totalExpenses,
        categoriesUsed: categories.length,
        highestCategory: categoryTotals[0]?.name || "-",
        categoryBreakdown: categoryTotals,
      },
    });
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
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

    const body = await request.json();
    const parsed = expenseSchema.safeParse({
      ...body,
      amount: Number(body.amount) || 0,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { categoryId: categoryInput, amount, date, description, receiptUrl } = parsed.data;

    // categoryInput can be a UUID (categoryId) or a category name string
    // Find or create the category
    let finalCategoryId = categoryInput;
    const isUUID = /^[a-z0-9]{20,}$/.test(categoryInput) || categoryInput.includes("-");

    if (!isUUID) {
      // It's a name, find or create category
      let category = await prisma.expenseCategory.findFirst({
        where: { hostelId: params.id, name: { equals: categoryInput, mode: "insensitive" } },
      });
      if (!category) {
        category = await prisma.expenseCategory.create({
          data: { name: categoryInput, hostelId: params.id, type: "HOSTEL_LEVEL" },
        });
      }
      finalCategoryId = category.id;
    }

    const expense = await prisma.expense.create({
      data: {
        hostelId: params.id,
        createdById: session.user.id,
        categoryId: finalCategoryId,
        amount,
        date: new Date(date),
        description: description || null,
        receiptUrl: receiptUrl || null,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error('Failed to create expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Edit expense
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { expenseId, amount, date, description, categoryId, receiptUrl } = body;

    if (!expenseId) return NextResponse.json({ error: "Expense ID required" }, { status: 400 });

    const expense = await prisma.expense.findFirst({ where: { id: expenseId, hostelId: params.id } });
    if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    const updateData: any = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount) || 0;
    if (date) updateData.date = new Date(date);
    if (description !== undefined) updateData.description = description;
    if (receiptUrl !== undefined) updateData.receiptUrl = receiptUrl || null;

    await prisma.expense.update({ where: { id: expenseId }, data: updateData });

    return NextResponse.json({ message: "Expense updated" });
  } catch (error) {
    console.error("Update expense error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
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
