"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/providers";
import {
  Banknote,
  Loader2,
  CheckCircle,
  Calendar,
  Download,
} from "lucide-react";

interface SalaryRecord {
  id: string;
  month: number;
  year: number;
  amount: number;
  bonus: number;
  deduction: number;
  netAmount: number;
  isPaid: boolean;
  method: string | null;
  user: { id: string; name: string; email: string; salary: number | null };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ManagerSalaryPage() {
  const { addToast } = useToast();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchSalaries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/managers/salary?month=${month}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setSalaries(data.salaries || []);
        setStats(data.stats);
      }
    } catch { } finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { fetchSalaries(); }, [fetchSalaries]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/managers/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      addToast(data.message || data.error, res.ok ? "success" : "error");
      if (res.ok) fetchSalaries();
    } catch { addToast("Failed to generate", "error"); }
    finally { setGenerating(false); }
  };

  const handleMarkPaid = async (recordId: string) => {
    try {
      const res = await fetch("/api/managers/salary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, isPaid: true, method: "CASH" }),
      });
      if (res.ok) {
        addToast("Marked as paid", "success");
        fetchSalaries();
      }
    } catch { addToast("Failed to update", "error"); }
  };

  const handleMarkAllPaid = async () => {
    try {
      const res = await fetch("/api/managers/salary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      if (res.ok) {
        addToast("All salaries marked as paid", "success");
        fetchSalaries();
      }
    } catch { addToast("Failed to update", "error"); }
  };

  const yearOptions = [];
  for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) yearOptions.push(y);

  return (
    <DashboardLayout title="Manager Salary">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="page-title">Manager Salary</h1>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-text-muted" />
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="select !h-10 text-sm !w-auto">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="select !h-10 text-sm !w-auto">
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={handleGenerate} disabled={generating} className="btn-primary flex items-center gap-2">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Banknote size={16} />}
              {generating ? "Generating..." : "Generate Salary Sheet"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : salaries.length === 0 ? (
          <div className="card text-center py-16">
            <Banknote size={48} className="mx-auto text-text-muted opacity-30 mb-4" />
            <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">No Salary Records</h3>
            <p className="text-text-muted text-sm">Click "Generate Salary Sheet" to create salary records for all managers.</p>
          </div>
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Manager</th>
                    <th className="table-header">Email</th>
                    <th className="table-header text-right">Base Salary</th>
                    <th className="table-header text-right">Bonus</th>
                    <th className="table-header text-right">Deduction</th>
                    <th className="table-header text-right">Net Amount</th>
                    <th className="table-header text-center">Status</th>
                    <th className="table-header text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {salaries.map((s) => (
                    <tr key={s.id} className="table-row">
                      <td className="table-cell font-medium">{s.user.name}</td>
                      <td className="table-cell text-text-muted text-xs">{s.user.email}</td>
                      <td className="table-cell text-right">{formatCurrency(s.amount)}</td>
                      <td className="table-cell text-right text-emerald-600">{s.bonus > 0 ? formatCurrency(s.bonus) : "-"}</td>
                      <td className="table-cell text-right text-red-500">{s.deduction > 0 ? formatCurrency(s.deduction) : "-"}</td>
                      <td className="table-cell text-right font-bold">{formatCurrency(s.netAmount)}</td>
                      <td className="table-cell text-center">
                        <span className={s.isPaid ? "badge-success" : "badge-warning"}>
                          {s.isPaid ? "PAID" : "UNPAID"}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        {!s.isPaid && (
                          <button onClick={() => handleMarkPaid(s.id)} className="btn-success !py-1 !px-3 !text-xs">
                            <CheckCircle size={12} /> Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Stats Footer */}
            {stats && (
              <div className="card">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                  <div>
                    <p className="text-xs text-text-muted">Total Base</p>
                    <p className="text-lg font-bold">{formatCurrency(stats.totalBase)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Total Bonus</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(stats.totalBonus)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Total Deductions</p>
                    <p className="text-lg font-bold text-red-500">{formatCurrency(stats.totalDeductions)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Total Net</p>
                    <p className="text-lg font-bold">{formatCurrency(stats.totalNet)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Paid / Unpaid</p>
                    <p className="text-lg font-bold">
                      <span className="text-emerald-600">{stats.paidCount}</span>
                      {" / "}
                      <span className="text-red-500">{stats.unpaidCount}</span>
                    </p>
                  </div>
                </div>
                {stats.unpaidCount > 0 && (
                  <div className="mt-4 flex justify-end">
                    <button onClick={handleMarkAllPaid} className="btn-success flex items-center gap-2">
                      <CheckCircle size={16} /> Mark All Paid
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
