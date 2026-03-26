'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, CheckCircle, FileText, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SalaryRecord {
  id: string;
  staffId: string;
  staffName: string;
  staffType: string;
  baseSalary: number;
  bonus: number;
  deduction: number;
  netAmount: number;
  status: string;
  month: number;
  year: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SalarySheetPage() {
  const params = useParams();
  const router = useRouter();
  const hostelId = params.id as string;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchSalaryRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/hostels/${hostelId}/staff/salary?month=${month}&year=${year}`
      );
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('Failed to fetch salary records:', error);
    } finally {
      setLoading(false);
    }
  }, [hostelId, month, year]);

  useEffect(() => {
    fetchSalaryRecords();
  }, [fetchSalaryRecords]);

  const generateSalarySheet = async () => {
    try {
      setGenerating(true);
      const res = await fetch(`/api/hostels/${hostelId}/staff/salary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      if (res.ok) {
        await fetchSalaryRecords();
      }
    } catch (error) {
      console.error('Failed to generate salary sheet:', error);
    } finally {
      setGenerating(false);
    }
  };

  const markPaid = async (recordId: string) => {
    try {
      const res = await fetch(`/api/hostels/${hostelId}/staff/salary`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, status: 'PAID' }),
      });
      if (res.ok) {
        setRecords((prev) =>
          prev.map((r) => (r.id === recordId ? { ...r, status: 'PAID' } : r))
        );
      }
    } catch (error) {
      console.error('Failed to mark as paid:', error);
    }
  };

  const markAllPaid = async () => {
    try {
      const unpaidIds = records.filter((r) => r.status === 'UNPAID').map((r) => r.id);
      await Promise.all(
        unpaidIds.map((id) =>
          fetch(`/api/hostels/${hostelId}/staff/salary`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recordId: id, status: 'PAID' }),
          })
        )
      );
      setRecords((prev) => prev.map((r) => ({ ...r, status: 'PAID' })));
    } catch (error) {
      console.error('Failed to mark all as paid:', error);
    }
  };

  const totalBase = records.reduce((sum, r) => sum + r.baseSalary, 0);
  const totalBonus = records.reduce((sum, r) => sum + r.bonus, 0);
  const totalDeduction = records.reduce((sum, r) => sum + r.deduction, 0);
  const totalNet = records.reduce((sum, r) => sum + r.netAmount, 0);
  const paidCount = records.filter((r) => r.status === 'PAID').length;
  const unpaidCount = records.filter((r) => r.status === 'UNPAID').length;

  return (
    <DashboardLayout title="Salary Sheet" hostelId={hostelId}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/hostel/${hostelId}/staff`)}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <h1 className="page-title">Salary Sheet</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={generateSalarySheet}
              disabled={generating}
              className="btn-primary flex items-center gap-2"
            >
              <FileText size={16} />
              {generating ? 'Generating...' : 'Generate Salary Sheet'}
            </button>
            {unpaidCount > 0 && (
              <button
                onClick={markAllPaid}
                className="btn-success flex items-center gap-2"
              >
                <CheckCircle size={16} />
                Mark All Paid
              </button>
            )}
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

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading salary records...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No salary records found for {MONTHS[month - 1]} {year}. Click &quot;Generate Salary Sheet&quot; to create records.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-700">Staff Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">Type</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">Base Salary</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">Bonus</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">Deduction</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">Net Amount</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-700">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{record.staffName}</td>
                      <td className="px-4 py-3">
                        <span className="badge-primary">{record.staffType}</span>
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(record.baseSalary)}</td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {record.bonus > 0 ? `+${formatCurrency(record.bonus)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {record.deduction > 0 ? `-${formatCurrency(record.deduction)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(record.netAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={record.status === 'PAID' ? 'badge-success' : 'badge-warning'}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {record.status === 'UNPAID' && (
                          <button
                            onClick={() => markPaid(record.id)}
                            className="btn-success text-xs px-3 py-1"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {records.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Total Base</p>
                  <p className="text-lg font-semibold">{formatCurrency(totalBase)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Total Bonus</p>
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(totalBonus)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Total Deductions</p>
                  <p className="text-lg font-semibold text-red-600">{formatCurrency(totalDeduction)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Total Net</p>
                  <p className="text-lg font-bold">{formatCurrency(totalNet)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Paid / Unpaid</p>
                  <p className="text-lg font-semibold">
                    <span className="text-green-600">{paidCount}</span>
                    {' / '}
                    <span className="text-yellow-600">{unpaidCount}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
