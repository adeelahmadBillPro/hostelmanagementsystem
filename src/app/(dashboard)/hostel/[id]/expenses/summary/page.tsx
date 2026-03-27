'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, MultiBarChart } from '@/components/ui/chart';

const PIE_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#0EA5E9', '#8B5CF6'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface SummaryData {
  income: {
    rentCollected: number;
    foodRevenue: number;
    otherIncome: number;
    totalIncome: number;
  };
  expenses: {
    categories: { name: string; amount: number }[];
    totalExpenses: number;
  };
  netProfitLoss: number;
  monthlyComparison: {
    month: string;
    income: number;
    expenses: number;
  }[];
}

export default function ExpenseSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const hostelId = params.id as string;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/hostels/${hostelId}/expenses/summary?month=${month}&year=${year}`
      );
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setLoading(false);
    }
  }, [hostelId, month, year]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const isProfit = data ? data.netProfitLoss >= 0 : true;

  return (
    <DashboardLayout title="P&L Summary" hostelId={hostelId}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/hostel/${hostelId}/expenses`)}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <h1 className="page-title">Profit & Loss Summary</h1>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4 mb-6">
            <div>
              <label className="label">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="select"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="select"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading summary...</div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Income Section */}
              <div className="card border-l-4 border-l-green-500">
                <h2 className="section-title text-green-700 flex items-center gap-2">
                  <TrendingUp size={20} />
                  Income
                </h2>
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rent Collected</span>
                    <span className="font-semibold">{formatCurrency(data.income.rentCollected)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Food Revenue</span>
                    <span className="font-semibold">{formatCurrency(data.income.foodRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Other Income</span>
                    <span className="font-semibold">{formatCurrency(data.income.otherIncome)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t font-bold text-green-700">
                    <span>Total Income</span>
                    <span>{formatCurrency(data.income.totalIncome)}</span>
                  </div>
                </div>
              </div>

              {/* Expense Section */}
              <div className="card border-l-4 border-l-red-500">
                <h2 className="section-title text-red-700 flex items-center gap-2">
                  <TrendingDown size={20} />
                  Expenses
                </h2>
                <div className="space-y-3 mt-4">
                  {data.expenses.categories.map((cat) => (
                    <div key={cat.name} className="flex justify-between">
                      <span className="text-gray-600">{cat.name}</span>
                      <span className="font-semibold">{formatCurrency(cat.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 border-t font-bold text-red-700">
                    <span>Total Expenses</span>
                    <span>{formatCurrency(data.expenses.totalExpenses)}</span>
                  </div>
                </div>
              </div>

              {/* Net P&L */}
              <div
                className={`card border-l-4 ${
                  isProfit ? 'border-l-green-500 bg-green-50' : 'border-l-red-500 bg-red-50'
                }`}
              >
                <h2 className="section-title">Net {isProfit ? 'Profit' : 'Loss'}</h2>
                <div className="mt-4 text-center">
                  <p
                    className={`text-4xl font-bold ${
                      isProfit ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {isProfit ? '+' : '-'}
                    {formatCurrency(Math.abs(data.netProfitLoss))}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {MONTHS[month - 1]} {year}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Expense Pie Chart */}
              <div className="card">
                <h2 className="section-title mb-4">Expenses by Category</h2>
                {data.expenses.categories.length > 0 ? (
                  <PieChart
                    data={data.expenses.categories.map((c) => ({ label: c.name, value: c.amount }))}
                    colors={PIE_COLORS}
                    height={300}
                    formatValue={(v) => formatCurrency(v)}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-400">No expense data</div>
                )}
              </div>

              {/* Monthly Comparison Bar Chart */}
              <div className="card">
                <h2 className="section-title mb-4">Monthly Income vs Expenses (Last 6 Months)</h2>
                {data.monthlyComparison.length > 0 ? (
                  <MultiBarChart
                    data={data.monthlyComparison.map((m) => ({ label: m.month, income: m.income, expenses: m.expenses }))}
                    series={[
                      { key: 'income', name: 'Income', color: '#10B981' },
                      { key: 'expenses', name: 'Expenses', color: '#EF4444' },
                    ]}
                    height={300}
                    formatValue={(v) => formatCurrency(v)}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-400">No comparison data</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">No data available</div>
        )}
      </div>
    </DashboardLayout>
  );
}
