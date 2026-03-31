"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/ui/stat-card";
import { useToast } from "@/components/providers";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Receipt, DollarSign, ArrowDownCircle, ArrowUpCircle,
  Calendar, Loader2, User, RefreshCw,
} from "lucide-react";

interface SettlementData {
  id: string;
  checkoutDate: string;
  daysStayed: number;
  billingType: string;
  totalCharges: number;
  totalCredits: number;
  netAmount: number;
  settlementType: string;
  damageCharges: number;
  notes: string | null;
  createdAt: string;
  resident: {
    id: string;
    user: { name: string; email: string };
    room: { roomNumber: string } | null;
  };
  completedBy: { name: string };
}

export default function SettlementsPage() {
  const params = useParams();
  const hostelId = params.id as string;
  const { addToast } = useToast();

  const [settlements, setSettlements] = useState<SettlementData[]>([]);
  const [stats, setStats] = useState({ total: 0, totalDues: 0, totalRefunds: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hostels/${hostelId}/settlements`);
      if (res.ok) {
        const data = await res.json();
        setSettlements(data.settlements || []);
        setStats(data.stats || { total: 0, totalDues: 0, totalRefunds: 0, thisMonth: 0 });
      }
    } catch {
      addToast("Failed to load settlements", "error");
    } finally {
      setLoading(false);
    }
  }, [hostelId, addToast]);

  useEffect(() => { fetchSettlements(); }, [fetchSettlements]);

  const billingLabel: Record<string, string> = {
    MONTHLY: "Monthly",
    WEEKLY: "Weekly",
    DAILY: "Daily",
    PER_NIGHT: "Per Night",
  };

  return (
    <DashboardLayout title="Settlements" hostelId={hostelId}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-white flex items-center gap-2">
              <Receipt size={24} className="text-primary" />
              Checkout Settlements
            </h2>
            <p className="text-text-muted dark:text-slate-400 mt-1">
              History of all resident checkouts and financial settlements
            </p>
          </div>
          <button onClick={fetchSettlements} disabled={loading} className="btn-secondary flex items-center gap-2 self-start sm:self-auto">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Checkouts" value={stats.total} icon={Receipt} iconColor="#6366F1" delay={0} />
          <StatCard label="Outstanding Dues" value={formatCurrency(stats.totalDues)} icon={ArrowUpCircle} iconColor="#EF4444" delay={100} />
          <StatCard label="Total Refunds" value={formatCurrency(stats.totalRefunds)} icon={ArrowDownCircle} iconColor="#22C55E" delay={200} />
          <StatCard label="This Month" value={stats.thisMonth} icon={Calendar} iconColor="#F59E0B" delay={300} />
        </div>

        {/* Table */}
        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : settlements.length === 0 ? (
          <div className="card p-12 text-center">
            <Receipt size={40} className="text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-muted dark:text-slate-400">No settlements yet</p>
            <p className="text-xs text-text-muted dark:text-slate-500 mt-1">
              Settlements are created when residents are checked out
            </p>
          </div>
        ) : (
          <div className="card overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[750px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#1E2D42]">
                  {["Resident", "Room", "Type", "Days", "Charges", "Credits", "Settlement", "Date", "By"].map((h) => (
                    <th key={h} className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {settlements.map((s, idx) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-100 dark:border-[#1E2D42] hover:bg-gray-50 dark:hover:bg-[#111C2E] transition-colors animate-fade-in"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User size={14} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary dark:text-white">{s.resident.user.name}</p>
                          <p className="text-xs text-text-muted dark:text-slate-400">{s.resident.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-text-primary dark:text-white">
                      {s.resident.room?.roomNumber || "—"}
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {billingLabel[s.billingType] || s.billingType}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-text-primary dark:text-white font-medium">
                      {s.daysStayed}
                    </td>
                    <td className="p-4 text-sm font-medium text-red-500">
                      {formatCurrency(s.totalCharges)}
                    </td>
                    <td className="p-4 text-sm font-medium text-green-500">
                      -{formatCurrency(s.totalCredits)}
                    </td>
                    <td className="p-4">
                      {s.settlementType === "DUES" ? (
                        <span className="badge-danger text-xs">{formatCurrency(s.netAmount)} due</span>
                      ) : s.settlementType === "REFUND" ? (
                        <span className="badge-success text-xs">{formatCurrency(Math.abs(s.netAmount))} refund</span>
                      ) : (
                        <span className="badge-info text-xs">Settled</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-text-muted dark:text-slate-400">
                      {formatDate(s.checkoutDate)}
                    </td>
                    <td className="p-4 text-xs text-text-muted dark:text-slate-400">
                      {s.completedBy.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
