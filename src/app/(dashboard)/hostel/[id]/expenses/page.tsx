'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import StatCard from '@/components/ui/stat-card';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DollarSign, Tag, Plus, Trash2, Edit, BarChart3, Receipt } from 'lucide-react';

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
      const res = await fetch(`/api/hostels/${hostelId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
        }),
      });
      if (res.ok) {
        setShowModal(false);
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

  const columns = [
    {
      label: 'Date',
      key: 'date' as keyof Expense,
      render: (row: Expense) => <span>{formatDate(row.date)}</span>,
    },
    {
      label: 'Category',
      key: 'category' as keyof Expense,
      render: (row: Expense) => <span className="badge-primary">{row.category}</span>,
    },
    {
      label: 'Description',
      key: 'description' as keyof Expense,
      render: (row: Expense) => <span className="text-gray-700">{row.description}</span>,
    },
    {
      label: 'Amount',
      key: 'amount' as keyof Expense,
      render: (row: Expense) => (
        <span className="font-semibold text-red-600">{formatCurrency(row.amount)}</span>
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
            className="text-indigo-600 hover:underline flex items-center gap-1"
          >
            <Receipt size={14} />
            View
          </a>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      label: 'Added By',
      key: 'addedBy' as keyof Expense,
      render: (row: Expense) => <span>{row.addedBy}</span>,
    },
    {
      label: 'Actions',
      key: 'id' as keyof Expense,
      render: (row: Expense) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeleteId(row.id)}
            className="text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Expenses" hostelId={hostelId}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Expenses</h1>
          <div className="flex gap-3">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            title="Total Expenses (Month)"
            value={formatCurrency(totalExpenses)}
            icon={<DollarSign size={24} />}
            color="#EF4444"
          />
          <StatCard
            title="Categories"
            value={uniqueCategories.length}
            icon={<Tag size={24} />}
            color="#4F46E5"
          />
        </div>

        <div className="card">
          <div className="flex flex-wrap items-center gap-4 mb-4">
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
            <div>
              <label className="label">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="select"
              >
                <option value="ALL">All Categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={expenses}
            emptyMessage="No expenses found for this period"
          />
        </div>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Add Expense"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="select"
                required
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
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
              <label className="label">Receipt URL</label>
              <input
                type="url"
                value={form.receiptUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, receiptUrl: e.target.value }))}
                className="input"
                placeholder="https://..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Add Expense'}
              </button>
            </div>
          </form>
        </Modal>

        <ConfirmDialog
          isOpen={!!deleteId}
          title="Delete Expense"
          message="Are you sure you want to delete this expense?"
          onConfirm={handleDelete}
          onClose={() => setDeleteId(null)}
        />
      </div>
    </DashboardLayout>
  );
}
