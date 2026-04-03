'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import StatCard from '@/components/ui/stat-card';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DollarSign, Tag, Plus, Trash2, BarChart3, Receipt, Wallet, FileText } from 'lucide-react';

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  receiptUrl: string | null;
  addedBy: string;
}

const EXPENSE_CATEGORIES = [
  'UTILITIES',
  'MAINTENANCE',
  'GROCERIES',
  'SALARIES',
  'RENT',
  'EQUIPMENT',
  'CLEANING',
  'INTERNET',
  'TRANSPORT',
  'MISCELLANEOUS',
];

const CATEGORY_COLORS: Record<string, string> = {
  UTILITIES: "bg-blue-50 text-blue-700 ring-blue-600/10 dark:bg-blue-900/30 dark:text-blue-300",
  MAINTENANCE: "bg-orange-50 text-orange-700 ring-orange-600/10 dark:bg-orange-900/30 dark:text-orange-300",
  GROCERIES: "bg-green-50 text-green-700 ring-green-600/10 dark:bg-green-900/30 dark:text-green-300",
  SALARIES: "bg-purple-50 text-purple-700 ring-purple-600/10 dark:bg-purple-900/30 dark:text-purple-300",
  RENT: "bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-900/30 dark:text-red-300",
  EQUIPMENT: "bg-indigo-50 text-indigo-700 ring-indigo-600/10 dark:bg-indigo-900/30 dark:text-indigo-300",
  CLEANING: "bg-cyan-50 text-cyan-700 ring-cyan-600/10 dark:bg-cyan-900/30 dark:text-cyan-300",
  INTERNET: "bg-sky-50 text-sky-700 ring-sky-600/10 dark:bg-sky-900/30 dark:text-sky-300",
  TRANSPORT: "bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-900/30 dark:text-amber-300",
  MISCELLANEOUS: "bg-slate-50 text-slate-700 ring-slate-600/10 dark:bg-slate-900/30 dark:text-slate-300",
};

const CATEGORY_ICONS: Record<string, string> = {
  UTILITIES: "Zap",
  MAINTENANCE: "Wrench",
  GROCERIES: "ShoppingCart",
  SALARIES: "Users",
  RENT: "Home",
  EQUIPMENT: "Package",
  CLEANING: "Droplets",
  INTERNET: "Wifi",
  TRANSPORT: "Truck",
  MISCELLANEOUS: "MoreHorizontal",
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ExpensesPage() {
  const params = useParams();
  const router = useRouter();
  const hostelId = params.id as string;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [category, setCategory] = useState('ALL');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    category: 'UTILITIES',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    receiptUrl: '',
  });
  const [customCategory, setCustomCategory] = useState('');

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        month: month.toString(),
        year: year.toString(),
      });
      if (category !== 'ALL') {
        queryParams.append('category', category);
      }
      const res = await fetch(`/api/hostels/${hostelId}/expenses?${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [hostelId, month, year, category]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalCategory = form.category === 'CUSTOM'
        ? (customCategory.trim().toUpperCase() || 'MISCELLANEOUS')
        : form.category;

      const res = await fetch(`/api/hostels/${hostelId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          category: finalCategory,
          amount: parseFloat(form.amount),
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setCustomCategory('');
        setForm({
          category: 'UTILITIES',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          description: '',
          receiptUrl: '',
        });
        await fetchExpenses();
      }
    } catch (error) {
      console.error('Failed to create expense:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/hostels/${hostelId}/expenses?expenseId=${deleteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== deleteId));
      }
    } catch (error) {
      console.error('Failed to delete expense:', error);
    } finally {
      setDeleteId(null);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const uniqueCategories = [...new Set(expenses.map((e) => e.category))];
  const highestCategory = expenses.length > 0
    ? Object.entries(
        expenses.reduce((acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + e.amount;
          return acc;
        }, {} as Record<string, number>)
      ).sort(([, a], [, b]) => b - a)[0]?.[0] || "-"
    : "-";

  const columns = [
    {
      label: 'Date',
      key: 'date' as keyof Expense,
      render: (row: Expense) => (
        <span className="text-text-primary dark:text-white font-medium">{formatDate(row.date)}</span>
      ),
    },
    {
      label: 'Category',
      key: 'category' as keyof Expense,
      render: (row: Expense) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 ${CATEGORY_COLORS[row.category] || "bg-gray-50 text-gray-700 ring-gray-200"}`}>
          {row.category}
        </span>
      ),
    },
    {
      label: 'Description',
      key: 'description' as keyof Expense,
      render: (row: Expense) => (
        <span className="text-text-secondary dark:text-gray-300 max-w-[200px] truncate block">{row.description}</span>
      ),
    },
    {
      label: 'Amount',
      key: 'amount' as keyof Expense,
      render: (row: Expense) => (
        <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      label: 'Receipt',
      key: 'receiptUrl' as keyof Expense,
      render: (row: Expense) =>
        row.receiptUrl ? (
          <a
            href={row.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-dark transition-colors bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-lg"
          >
            <Receipt size={13} />
            View
          </a>
        ) : (
          <span className="text-text-muted">-</span>
        ),
    },
    {
      label: 'Added By',
      key: 'addedBy' as keyof Expense,
      render: (row: Expense) => <span className="text-text-muted">{row.addedBy}</span>,
    },
  ];

  return (
    <DashboardLayout title="Expenses" hostelId={hostelId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="page-title">Expenses</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/hostel/${hostelId}/expenses/summary`)}
              className="btn-secondary flex items-center gap-2"
            >
              <BarChart3 size={16} />
              P&L Summary
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              Add Expense
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Expenses"
            value={formatCurrency(totalExpenses)}
            icon={<Wallet size={24} />}
            color="#EF4444"
          />
          <StatCard
            title="Categories Used"
            value={uniqueCategories.length}
            icon={<Tag size={24} />}
            color="#4F46E5"
            delay={100}
          />
          <StatCard
            title="Highest Category"
            value={highestCategory}
            icon={<FileText size={24} />}
            color="#F59E0B"
            delay={200}
          />
        </div>

        {/* Filters + Table */}
        <div className="card">
          <div className="flex flex-wrap items-end gap-3 mb-5">
            <div className="min-w-[140px]">
              <label className="label">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="select !h-10 text-sm"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[100px]">
              <label className="label">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="select !h-10 text-sm"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[160px]">
              <label className="label">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="select !h-10 text-sm"
              >
                <option value="ALL">All Categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={expenses}
            emptyMessage="No expenses found for this period"
            actions={(row: Expense) => (
              <button
                onClick={() => setDeleteId(row.id)}
                className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Delete"
              >
                <Trash2 size={15} className="text-red-400 hover:text-red-600" />
              </button>
            )}
          />
        </div>

        {/* Add Expense Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Add Expense"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="select"
                  required
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="CUSTOM">✏️ Custom (type your own)</option>
                </select>
                {form.category === 'CUSTOM' && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="input mt-2"
                    placeholder="e.g., Gas Bill, Paint, Generator Fuel..."
                    required
                    autoFocus
                  />
                )}
              </div>
              <div>
                <label className="label">Amount (PKR) *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="input"
                  required
                  min="0"
                  step="0.01"
                  placeholder="Enter amount"
                />
              </div>
            </div>
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="textarea"
                required
                rows={3}
                placeholder="Describe the expense"
              />
            </div>
            <div>
              <label className="label">Receipt URL <span className="text-text-muted font-normal">(optional)</span></label>
              <input
                type="url"
                value={form.receiptUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, receiptUrl: e.target.value }))}
                className="input"
                placeholder="https://..."
              />
            </div>

            {/* Quick preview */}
            {form.amount && form.description && (
              <div className="p-3 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-800/20">
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ring-1 ${CATEGORY_COLORS[form.category] || "bg-slate-50 text-slate-700 ring-slate-600/10 dark:bg-slate-900/30 dark:text-slate-300"}`}>
                      {form.category === 'CUSTOM' ? (customCategory || 'CUSTOM') : form.category}
                    </span>
                    <p className="text-sm text-text-secondary dark:text-gray-400 mt-1 truncate max-w-[280px]">{form.description}</p>
                  </div>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(Number(form.amount) || 0)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Add Expense"
                )}
              </button>
            </div>
          </form>
        </Modal>

        <ConfirmDialog
          isOpen={!!deleteId}
          title="Delete Expense"
          message="Are you sure you want to delete this expense? This action cannot be undone."
          onConfirm={handleDelete}
          onClose={() => setDeleteId(null)}
        />
      </div>
    </DashboardLayout>
  );
}
