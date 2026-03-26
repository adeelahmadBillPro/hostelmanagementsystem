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

    const hostelId = params.id;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Fetch rent payments for the month
    const rentPayments = await prisma.payment.findMany({
      where: {
        hostelId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const rentCollected = rentPayments.reduce((sum: number, p: any) => sum + p.amount, 0);

    // Fetch food orders revenue
    const foodOrders = await prisma.foodOrder.findMany({
      where: {
        hostelId,
        orderDate: { gte: startDate, lte: endDate },
      },
    });

    const foodRevenue = foodOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);

    // Other income placeholder (no Income model in schema)
    const otherIncome = 0;

    const totalIncome = rentCollected + foodRevenue + otherIncome;

    // Fetch expenses grouped by category
    const expenses = await prisma.expense.findMany({
      where: {
        hostelId,
        date: { gte: startDate, lte: endDate },
      },
      include: { category: true },
    });

    const categoryMap: Record<string, number> = {};
    expenses.forEach((e: any) => {
      const catName = e.category?.name || 'Uncategorized';
      categoryMap[catName] = (categoryMap[catName] || 0) + e.amount;
    });

    const categories = Object.entries(categoryMap).map(([name, amount]) => ({
      name,
      amount,
    }));

    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    const netProfitLoss = totalIncome - totalExpenses;

    // Monthly comparison (last 6 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyComparison = [];

    for (let i = 5; i >= 0; i--) {
      const compDate = new Date(year, month - 1 - i, 1);
      const compMonth = compDate.getMonth();
      const compYear = compDate.getFullYear();
      const compStart = new Date(compYear, compMonth, 1);
      const compEnd = new Date(compYear, compMonth + 1, 0, 23, 59, 59);

      const monthPayments = await prisma.payment.findMany({
        where: {
          hostelId,
          date: { gte: compStart, lte: compEnd },
        },
      });

      const monthFoodOrders = await prisma.foodOrder.findMany({
        where: {
          hostelId,
          orderDate: { gte: compStart, lte: compEnd },
        },
      });

      const monthExpenses = await prisma.expense.findMany({
        where: {
          hostelId,
          date: { gte: compStart, lte: compEnd },
        },
      });

      const monthIncome =
        monthPayments.reduce((sum: number, p: any) => sum + p.amount, 0) +
        monthFoodOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);

      const monthExpenseTotal = monthExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);

      monthlyComparison.push({
        month: `${monthNames[compMonth]} ${compYear}`,
        income: monthIncome,
        expenses: monthExpenseTotal,
      });
    }

    return NextResponse.json({
      income: {
        rentCollected,
        foodRevenue,
        otherIncome,
        totalIncome,
      },
      expenses: {
        categories,
        totalExpenses,
      },
      netProfitLoss,
      monthlyComparison,
    });
  } catch (error) {
    console.error('Failed to fetch P&L summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
