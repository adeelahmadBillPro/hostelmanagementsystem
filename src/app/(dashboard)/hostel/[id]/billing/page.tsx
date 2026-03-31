"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/ui/stat-card";
import DataTable from "@/components/ui/data-table";
import Modal from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";
import {
  Receipt,
  DollarSign,
  Clock,
  AlertTriangle,
  Plus,
  Eye,
  CreditCard,
  Calendar,
  Loader2,
  Settings,
  Save,
  Zap,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/providers";

interface BillData {
  id: string;
  residentId: string;
  month: number;
  year: number;
  weekNumber: number | null;
  billingCycle: string;
  roomRent: number;
  foodCharges: number;
  fixedFoodFee: number;
  otherCharges: number;
  meterCharges: number;
  parkingFee: number;
  previousBalance: number;
  advanceDeduction: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  resident: {
    id: string;
    user: { name: string; email: string; phone: string | null };
    room: { roomNumber: string };
  };
}

interface Stats {
  totalBilled: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default function BillingPage() {
  const params = useParams();
  const router = useRouter();
  const hostelId = params.id as string;
  const { addToast } = useToast();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [weekNum, setWeekNum] = useState(getWeekNumber(now));
  const [bills, setBills] = useState<BillData[]>([]);
  const [stats, setStats] = useState<Stats>({ totalBilled: 0, totalCollected: 0, totalPending: 0, totalOverdue: 0 });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // Hostel billing settings
  const [billingCycle, setBillingCycle] = useState("MONTHLY");
  const [fixedFoodCharge, setFixedFoodCharge] = useState("0");
  const [billingDueDays, setBillingDueDays] = useState("7");
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Meal time settings
  const [mealTimes, setMealTimes] = useState({
    breakfastStart: 6, breakfastEnd: 9,
    lunchStart: 11, lunchEnd: 14,
    dinnerStart: 18, dinnerEnd: 21,
    snackStart: 10, snackEnd: 22,
  });

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/hostels/${hostelId}/billing?month=${month}&year=${year}`;
      if (billingCycle === "WEEKLY" || billingCycle === "BIWEEKLY") {
        url += `&week=${weekNum}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBills(data.bills);
      setStats(data.stats);
      if (data.hostelSettings) {
        setBillingCycle(data.hostelSettings.billingCycle);
        setFixedFoodCharge(String(data.hostelSettings.fixedFoodCharge));
        setBillingDueDays(String(data.hostelSettings.billingDueDays));
        setMealTimes({
          breakfastStart: data.hostelSettings.breakfastStart ?? 6,
          breakfastEnd: data.hostelSettings.breakfastEnd ?? 9,
          lunchStart: data.hostelSettings.lunchStart ?? 11,
          lunchEnd: data.hostelSettings.lunchEnd ?? 14,
          dinnerStart: data.hostelSettings.dinnerStart ?? 18,
          dinnerEnd: data.hostelSettings.dinnerEnd ?? 21,
          snackStart: data.hostelSettings.snackStart ?? 10,
          snackEnd: data.hostelSettings.snackEnd ?? 22,
        });
      }
    } catch (error) {
      console.error("Error fetching bills:", error);
    } finally {
      setLoading(false);
    }
  }, [hostelId, month, year, weekNum, billingCycle]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleGenerateBills = async () => {
    try {
      setGenerating(true);
      const body: any = { month, year, cycle: billingCycle };
      if (billingCycle === "WEEKLY" || billingCycle === "BIWEEKLY") {
        body.weekNumber = weekNum;
      }
      const res = await fetch(`/api/hostels/${hostelId}/billing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      addToast(data.message, "success");
      fetchBills();
    } catch (error: any) {
      addToast(error.message || "Failed to generate bills", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      const res = await fetch(`/api/hostels/${hostelId}/billing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to recalculate");
      addToast(data.message, data.count > 0 ? "success" : "info");
      if (data.count > 0) fetchBills();
    } catch (error: any) {
      addToast(error.message || "Failed to recalculate bills", "error");
    } finally {
      setRecalculating(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/hostels/${hostelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingCycle,
          fixedFoodCharge: parseFloat(fixedFoodCharge) || 0,
          billingDueDays: parseInt(billingDueDays) || 7,
          ...mealTimes,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setShowSettings(false);
      addToast("Billing settings saved!", "success");
    } catch {
      addToast("Failed to save settings", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID": return <span className="badge-success">Paid</span>;
      case "PARTIAL": return <span className="badge-warning">Partial</span>;
      case "UNPAID": return <span className="badge-danger">Unpaid</span>;
      case "OVERDUE": return <span className="badge-danger">Overdue</span>;
      default: return <span className="badge-primary">{status}</span>;
    }
  };

  const columns = [
    {
      key: "resident",
      label: "Resident",
      render: (row: BillData) => (
        <div>
          <p className="font-medium text-text-primary dark:text-white">{row.resident.user.name}</p>
          <p className="text-xs text-text-muted">Room {row.resident.room.roomNumber}</p>
        </div>
      ),
    },
    {
      key: "roomRent",
      label: "Rent",
      render: (row: BillData) => <span className="font-medium">{formatCurrency(row.roomRent)}</span>,
    },
    {
      key: "foodCharges",
      label: "Food",
      render: (row: BillData) => {
        const total = row.foodCharges + (row.fixedFoodFee || 0);
        return (
          <div>
            <span className="font-medium">{formatCurrency(total)}</span>
            {row.fixedFoodFee > 0 && row.foodCharges > 0 && (
              <p className="text-[10px] text-text-muted">Mess: {formatCurrency(row.fixedFoodFee)} + Orders: {formatCurrency(row.foodCharges)}</p>
            )}
            {row.fixedFoodFee > 0 && !row.foodCharges && (
              <p className="text-[10px] text-text-muted">Mess: {formatCurrency(row.fixedFoodFee)}</p>
            )}
            {!row.fixedFoodFee && row.foodCharges > 0 && (
              <p className="text-[10px] text-text-muted">Orders: {formatCurrency(row.foodCharges)}</p>
            )}
          </div>
        );
      },
    },
    {
      key: "otherCharges",
      label: "Other",
      render: (row: BillData) => formatCurrency(row.otherCharges + row.meterCharges + row.parkingFee),
    },
    {
      key: "totalAmount",
      label: "Total",
      render: (row: BillData) => <span className="font-bold">{formatCurrency(row.totalAmount)}</span>,
    },
    {
      key: "paidAmount",
      label: "Paid",
      render: (row: BillData) => (
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(row.paidAmount)}</span>
      ),
    },
    {
      key: "balance",
      label: "Balance",
      render: (row: BillData) => (
        <span className={row.balance > 0 ? "text-red-600 dark:text-red-400 font-bold" : "font-medium"}>
          {formatCurrency(row.balance)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: BillData) => getStatusBadge(row.status),
    },
  ];

  const yearOptions = [];
  for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) {
    yearOptions.push(y);
  }

  const cycleLabel = billingCycle === "WEEKLY" ? "Weekly" : billingCycle === "BIWEEKLY" ? "Bi-Weekly" : "Monthly";

  return (
    <DashboardLayout title="Billing Management" hostelId={hostelId}>
      {/* Period selector + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-text-muted" />
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="select !h-10 text-sm min-w-[120px]">
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="select !h-10 text-sm min-w-[80px]">
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {(billingCycle === "WEEKLY" || billingCycle === "BIWEEKLY") && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-muted">Week:</span>
              <input
                type="number"
                value={weekNum}
                onChange={(e) => setWeekNum(parseInt(e.target.value) || 1)}
                min={1}
                max={52}
                className="input !h-10 !w-20 text-sm text-center"
              />
            </div>
          )}

          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
            billingCycle === "WEEKLY" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            : billingCycle === "BIWEEKLY" ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          }`}>
            {cycleLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="btn-ghost flex items-center gap-2"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Settings</span>
          </button>
          {bills.length > 0 && (
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="btn-secondary flex items-center gap-2"
              title="Recalculate food charges for existing bills (picks up new orders)"
            >
              {recalculating ? (
                <><RefreshCw size={16} className="animate-spin" /> Recalculating...</>
              ) : (
                <><RefreshCw size={16} /> Recalculate</>
              )}
            </button>
          )}
          <button
            onClick={handleGenerateBills}
            disabled={generating}
            className="btn-primary flex items-center gap-2"
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" /> Generating...</>
            ) : (
              <><Zap size={16} /> Generate Bills</>
            )}
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 text-sm">
        <p className="font-semibold text-blue-800 dark:text-blue-300 mb-2">How billing works:</p>
        <ul className="text-blue-700 dark:text-blue-400 space-y-1 text-xs">
          <li>• Click &quot;Generate Bills&quot; to create bills for ALL active residents</li>
          <li>• Each resident&apos;s bill includes: Room Rent + Food Fee + App Orders + Meter + Parking</li>
          <li>• Scholarship/Govt residents get Rs 0 rent automatically</li>
          <li>• Food fee based on each resident&apos;s plan (Full Mess / No Mess / Custom)</li>
          <li>• Advance is deducted on first bill only</li>
          <li>• If residents order food after bills are generated, click &quot;Recalculate&quot; to update food charges</li>
        </ul>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Billed" value={formatCurrency(stats.totalBilled)} icon={Receipt} iconBg="#EEF2FF" iconColor="#4F46E5" delay={0} />
        <StatCard label="Collected" value={formatCurrency(stats.totalCollected)} icon={DollarSign} iconBg="#F0FDF4" iconColor="#16A34A" delay={100} />
        <StatCard label="Pending" value={formatCurrency(stats.totalPending)} icon={Clock} iconBg="#FFFBEB" iconColor="#D97706" delay={200} />
        <StatCard label="Overdue" value={formatCurrency(stats.totalOverdue)} icon={AlertTriangle} iconBg="#FEF2F2" iconColor="#DC2626" delay={300} />
      </div>

      {/* Bills Table */}
      {loading ? (
        <div className="card p-12 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={bills}
          searchPlaceholder="Search by resident name..."
          emptyMessage={`No bills for this period. Click 'Generate Bills' to create ${cycleLabel.toLowerCase()} bills for all active residents.`}
          onRowClick={(row) =>
            router.push(`/hostel/${hostelId}/billing/${row.residentId}?month=${month}&year=${year}`)
          }
          actions={(row) => (
            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push(`/hostel/${hostelId}/billing/${row.residentId}?month=${month}&year=${year}`)}
                className="p-1.5 rounded-lg hover:bg-bg-main dark:hover:bg-[#0B1222] transition-colors"
                title="View Detail"
              >
                <Eye size={16} className="text-text-muted" />
              </button>
              <button
                onClick={() => router.push(`/hostel/${hostelId}/billing/${row.residentId}?month=${month}&year=${year}&pay=true`)}
                className="p-1.5 rounded-lg hover:bg-bg-main dark:hover:bg-[#0B1222] transition-colors"
                title="Record Payment"
              >
                <CreditCard size={16} className="text-text-muted" />
              </button>
            </div>
          )}
        />
      )}

      {/* Billing Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Billing Settings"
        maxWidth="max-w-[560px]"
      >
        <div className="space-y-5">
          <div>
            <label className="label">Billing Cycle</label>
            <select
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value)}
              className="select"
            >
              <option value="WEEKLY">Weekly (every 7 days)</option>
              <option value="BIWEEKLY">Bi-Weekly (every 14 days)</option>
              <option value="MONTHLY">Monthly (full month)</option>
            </select>
            <p className="text-xs text-text-muted mt-1">
              {billingCycle === "WEEKLY" && "Rent is prorated: ~23% of monthly rent per week"}
              {billingCycle === "BIWEEKLY" && "Rent is prorated: ~47% of monthly rent per 2 weeks"}
              {billingCycle === "MONTHLY" && "Full monthly rent charged per billing cycle"}
            </p>
          </div>

          <div>
            <label className="label">Fixed Food/Mess Fee (PKR)</label>
            <input
              type="number"
              value={fixedFoodCharge}
              onChange={(e) => setFixedFoodCharge(e.target.value)}
              className="input"
              placeholder="e.g., 5000"
              min="0"
            />
            <p className="text-xs text-text-muted mt-1">
              Charged to every resident per billing cycle. Set to 0 if food is charged per-order only.
              {billingCycle === "WEEKLY" && fixedFoodCharge !== "0" && (
                <span className="text-primary font-medium"> Weekly charge: ~{formatCurrency(Math.round(Number(fixedFoodCharge) * 7 / 30))}</span>
              )}
            </p>
          </div>

          <div>
            <label className="label">Payment Due (days after bill generation)</label>
            <input
              type="number"
              value={billingDueDays}
              onChange={(e) => setBillingDueDays(e.target.value)}
              className="input"
              placeholder="7"
              min="1"
              max="30"
            />
            <p className="text-xs text-text-muted mt-1">
              Bills become overdue after this many days
            </p>
          </div>

          {/* Meal Ordering Time Windows */}
          <div>
            <label className="label mb-2">Meal Ordering Hours (24h format)</label>
            <div className="space-y-3">
              {([
                { label: "Breakfast", startKey: "breakfastStart", endKey: "breakfastEnd" },
                { label: "Lunch", startKey: "lunchStart", endKey: "lunchEnd" },
                { label: "Dinner", startKey: "dinnerStart", endKey: "dinnerEnd" },
                { label: "Snack", startKey: "snackStart", endKey: "snackEnd" },
              ] as const).map(({ label, startKey, endKey }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-sm text-text-secondary dark:text-slate-400 w-20 shrink-0">{label}</span>
                  <select
                    value={mealTimes[startKey]}
                    onChange={(e) => setMealTimes((p) => ({ ...p, [startKey]: parseInt(e.target.value) }))}
                    className="select !h-9 text-sm flex-1"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i === 0 ? "12 AM" : i === 12 ? "12 PM" : i < 12 ? `${i} AM` : `${i - 12} PM`}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-text-muted">to</span>
                  <select
                    value={mealTimes[endKey]}
                    onChange={(e) => setMealTimes((p) => ({ ...p, [endKey]: parseInt(e.target.value) }))}
                    className="select !h-9 text-sm flex-1"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i === 0 ? "12 AM" : i === 12 ? "12 PM" : i < 12 ? `${i} AM` : `${i - 12} PM`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">
              Residents can only order food during these hours. Each hostel can set their own times.
            </p>
          </div>

          {/* Summary */}
          <div className="p-3 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/15">
            <p className="text-xs font-semibold text-primary mb-2">Bill Breakdown per Resident</p>
            <div className="space-y-1 text-xs text-text-secondary dark:text-slate-400">
              <div className="flex justify-between">
                <span>Room Rent</span>
                <span>{billingCycle === "WEEKLY" ? "~23% of monthly" : billingCycle === "BIWEEKLY" ? "~47% of monthly" : "Full month"}</span>
              </div>
              <div className="flex justify-between">
                <span>Fixed Food Fee</span>
                <span>{Number(fixedFoodCharge) > 0 ? formatCurrency(Number(fixedFoodCharge)) + "/month" : "None"}</span>
              </div>
              <div className="flex justify-between">
                <span>App Food Orders</span>
                <span>Auto-calculated</span>
              </div>
              <div className="flex justify-between">
                <span>Meter + Parking</span>
                <span>Auto-calculated</span>
              </div>
              <div className="flex justify-between">
                <span>Previous Balance</span>
                <span>Carried forward</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowSettings(false)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSaveSettings} disabled={savingSettings} className="btn-primary flex items-center gap-2">
              {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Settings
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
