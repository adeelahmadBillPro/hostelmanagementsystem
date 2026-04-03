"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  UserPlus,
  User,
  Landmark,
  ChevronDown,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
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

interface ExtraCharge {
  id: string;
  name: string;
  amount: number;
  isActive: boolean;
  applyToAll: boolean;
  description: string | null;
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
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "TENANT_ADMIN" || session?.user?.role === "SUPER_ADMIN";

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [weekNum, setWeekNum] = useState(getWeekNumber(now));
  const [bills, setBills] = useState<BillData[]>([]);
  const [stats, setStats] = useState<Stats>({ totalBilled: 0, totalCollected: 0, totalPending: 0, totalOverdue: 0 });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // Single resident bill generation
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [allResidents, setAllResidents] = useState<{ id: string; name: string; room: string }[]>([]);
  const [selectedResidentIds, setSelectedResidentIds] = useState<string[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);

  // Hostel billing settings
  const [billingCycle, setBillingCycle] = useState("MONTHLY");
  const [fixedFoodCharge, setFixedFoodCharge] = useState("0");
  const [billingDueDays, setBillingDueDays] = useState("7");
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"billing" | "payment">("billing");

  // Payment method settings
  const [paymentMethods, setPaymentMethods] = useState({
    jazzCashNumber: "", jazzCashTitle: "",
    easyPaisaNumber: "", easyPaisaTitle: "",
    bankName: "", bankIBAN: "", bankTitle: "",
  });

  // Bill components filter
  const [billComponents, setBillComponents] = useState({ includeRent: true, includeFood: true, includeMess: true, includeUtilities: true });
  const [showComponents, setShowComponents] = useState(false);

  // Meal time settings
  const [mealTimes, setMealTimes] = useState({
    breakfastStart: 6, breakfastEnd: 9,
    lunchStart: 11, lunchEnd: 14,
    dinnerStart: 18, dinnerEnd: 21,
    snackStart: 10, snackEnd: 22,
  });

  // Extra charges
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [showExtraCharges, setShowExtraCharges] = useState(false);
  const [loadingExtraCharges, setLoadingExtraCharges] = useState(false);
  const [newChargeName, setNewChargeName] = useState("");
  const [newChargeAmount, setNewChargeAmount] = useState("");
  const [newChargeDescription, setNewChargeDescription] = useState("");
  const [addingCharge, setAddingCharge] = useState(false);
  const [editingCharge, setEditingCharge] = useState<ExtraCharge | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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
        const s = data.hostelSettings;
        setBillingCycle(s.billingCycle);
        setFixedFoodCharge(String(s.fixedFoodCharge));
        setBillingDueDays(String(s.billingDueDays));
        setMealTimes({
          breakfastStart: s.breakfastStart ?? 6,
          breakfastEnd: s.breakfastEnd ?? 9,
          lunchStart: s.lunchStart ?? 11,
          lunchEnd: s.lunchEnd ?? 14,
          dinnerStart: s.dinnerStart ?? 18,
          dinnerEnd: s.dinnerEnd ?? 21,
          snackStart: s.snackStart ?? 10,
          snackEnd: s.snackEnd ?? 22,
        });
        setPaymentMethods({
          jazzCashNumber: s.jazzCashNumber || "",
          jazzCashTitle: s.jazzCashTitle || "",
          easyPaisaNumber: s.easyPaisaNumber || "",
          easyPaisaTitle: s.easyPaisaTitle || "",
          bankName: s.bankName || "",
          bankIBAN: s.bankIBAN || "",
          bankTitle: s.bankTitle || "",
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

  const fetchExtraCharges = useCallback(async () => {
    try {
      setLoadingExtraCharges(true);
      const res = await fetch(`/api/hostels/${hostelId}/extra-charges`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setExtraCharges(data.extraCharges || []);
    } catch {
      // silent — not critical
    } finally {
      setLoadingExtraCharges(false);
    }
  }, [hostelId]);

  useEffect(() => {
    fetchExtraCharges();
  }, [fetchExtraCharges]);

  const handleAddCharge = async () => {
    if (!newChargeName.trim()) {
      addToast("Charge name is required", "error");
      return;
    }
    const amount = parseFloat(newChargeAmount);
    if (isNaN(amount) || amount < 0) {
      addToast("Please enter a valid amount (>= 0)", "error");
      return;
    }
    try {
      setAddingCharge(true);
      const res = await fetch(`/api/hostels/${hostelId}/extra-charges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChargeName.trim(), amount, description: newChargeDescription.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add charge");
      addToast("Extra charge added!", "success");
      setNewChargeName("");
      setNewChargeAmount("");
      setNewChargeDescription("");
      fetchExtraCharges();
    } catch (error: any) {
      addToast(error.message || "Failed to add charge", "error");
    } finally {
      setAddingCharge(false);
    }
  };

  const handleToggleCharge = async (charge: ExtraCharge) => {
    try {
      const res = await fetch(`/api/hostels/${hostelId}/extra-charges`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: charge.id, isActive: !charge.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      addToast(`Charge ${!charge.isActive ? "activated" : "deactivated"}`, "success");
      fetchExtraCharges();
    } catch (error: any) {
      addToast(error.message || "Failed to update charge", "error");
    }
  };

  const handleDeleteCharge = async (chargeId: string) => {
    if (!window.confirm("Delete this extra charge? It won't affect already-generated bills.")) return;
    try {
      const res = await fetch(`/api/hostels/${hostelId}/extra-charges?chargeId=${chargeId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      addToast("Extra charge deleted", "success");
      fetchExtraCharges();
    } catch (error: any) {
      addToast(error.message || "Failed to delete charge", "error");
    }
  };

  const startEditCharge = (charge: ExtraCharge) => {
    setEditingCharge(charge);
    setEditName(charge.name);
    setEditAmount(String(charge.amount));
    setEditDescription(charge.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingCharge) return;
    if (!editName.trim()) {
      addToast("Charge name is required", "error");
      return;
    }
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) {
      addToast("Please enter a valid amount (>= 0)", "error");
      return;
    }
    try {
      setSavingEdit(true);
      const res = await fetch(`/api/hostels/${hostelId}/extra-charges`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingCharge.id, name: editName.trim(), amount, description: editDescription.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      addToast("Extra charge updated!", "success");
      setEditingCharge(null);
      fetchExtraCharges();
    } catch (error: any) {
      addToast(error.message || "Failed to save", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleGenerateBills = async () => {
    try {
      setGenerating(true);
      const body: any = { month, year, cycle: billingCycle, ...billComponents };
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

  const openSingleModal = async () => {
    setShowSingleModal(true);
    setSelectedResidentIds([]);
    setLoadingResidents(true);
    try {
      const res = await fetch(`/api/hostels/${hostelId}/residents`);
      const data = await res.json();
      const list = (Array.isArray(data) ? data : data.residents || [])
        .filter((r: any) => r.status === "ACTIVE")
        .map((r: any) => ({ id: r.id, name: r.user?.name || "Unknown", room: r.room?.roomNumber || "?" }));
      setAllResidents(list);
    } catch { setAllResidents([]); }
    finally { setLoadingResidents(false); }
  };

  const handleGenerateForSelected = async () => {
    if (selectedResidentIds.length === 0) {
      addToast("Please select at least one resident", "error");
      return;
    }
    try {
      setGenerating(true);
      const body: any = { month, year, cycle: billingCycle, selectedResidentIds, ...billComponents };
      if (billingCycle === "WEEKLY" || billingCycle === "BIWEEKLY") body.weekNumber = weekNum;
      const res = await fetch(`/api/hostels/${hostelId}/billing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      addToast(data.message, "success");
      setShowSingleModal(false);
      fetchBills();
    } catch (error: any) {
      addToast(error.message || "Failed to generate bills", "error");
    } finally {
      setGenerating(false);
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
          ...paymentMethods,
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

  const cycleLabel = billingCycle === "DAILY" ? "Daily" : billingCycle === "WEEKLY" ? "Weekly" : billingCycle === "BIWEEKLY" ? "Bi-Weekly" : "Monthly";

  return (
    <DashboardLayout title="Billing Management" hostelId={hostelId}>
      {/* Page title row with role badge */}
      {session?.user?.role === "HOSTEL_MANAGER" && (
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 ring-1 ring-teal-600/20 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-500/20">
            Manager View
          </span>
        </div>
      )}

      {/* Period selector + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 flex-wrap">
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

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <button
              onClick={() => setShowSettings(true)}
              className="btn-ghost flex items-center gap-2"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}
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
            onClick={openSingleModal}
            className="btn-secondary flex items-center gap-2"
            title="Generate bill for specific resident(s)"
          >
            <UserPlus size={16} />
            <span className="hidden sm:inline">Single Resident</span>
          </button>
          <button
            onClick={handleGenerateBills}
            disabled={generating}
            className="btn-primary flex items-center gap-2"
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" /> Generating...</>
            ) : (
              <><Zap size={16} /> Generate All</>
            )}
          </button>
        </div>
      </div>

      {/* Bill Components Selector */}
      <div className="mb-4">
        <button onClick={() => setShowComponents(!showComponents)} className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
          <ChevronDown size={14} className={`transition-transform ${showComponents ? 'rotate-180' : ''}`} />
          Bill Components (what to include)
        </button>
        {showComponents && (
          <div className="mt-2 p-3 rounded-xl bg-bg-main dark:bg-[#0B1222] border border-border dark:border-[#1E2D42] flex flex-wrap gap-3">
            {[
              { key: 'includeRent', label: '🏠 Room Rent' },
              { key: 'includeFood', label: '🍴 Food Orders' },
              { key: 'includeMess', label: '🍽️ Mess Fee' },
              { key: 'includeUtilities', label: '⚡ Utilities (Electricity + Parking)' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={billComponents[key as keyof typeof billComponents]} onChange={e => setBillComponents(p => ({ ...p, [key]: e.target.checked }))} className="w-4 h-4 rounded accent-primary" />
                <span className="text-text-secondary dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Extra / Custom Charges */}
      {isAdmin && (
        <div className="mb-4">
          <button
            onClick={() => setShowExtraCharges(!showExtraCharges)}
            className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <ChevronDown size={14} className={`transition-transform ${showExtraCharges ? "rotate-180" : ""}`} />
            Extra / Custom Charges
            {extraCharges.filter(c => c.isActive).length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                {extraCharges.filter(c => c.isActive).length} active
                {" · "}
                {formatCurrency(extraCharges.filter(c => c.isActive).reduce((s, c) => s + c.amount, 0))}/cycle
              </span>
            )}
          </button>

          {showExtraCharges && (
            <div className="mt-3 p-4 rounded-xl bg-bg-main dark:bg-[#0B1222] border border-border dark:border-[#1E2D42] space-y-4">

              {/* Total summary */}
              {extraCharges.filter(c => c.isActive).length > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <Zap size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      {formatCurrency(extraCharges.filter(c => c.isActive).reduce((s, c) => s + c.amount, 0))} extra per resident/cycle
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      These charges are added to every resident&apos;s bill when generating
                    </p>
                  </div>
                </div>
              )}

              {/* Existing charges list */}
              {loadingExtraCharges ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={20} className="animate-spin text-primary" />
                </div>
              ) : extraCharges.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-2">No extra charges configured yet</p>
              ) : (
                <div className="space-y-2">
                  {extraCharges.map((charge) => (
                    <div key={charge.id}>
                      {editingCharge?.id === charge.id ? (
                        /* Inline edit form */
                        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="label text-xs">Name</label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="input text-sm"
                                placeholder="e.g. AC Charge"
                              />
                            </div>
                            <div>
                              <label className="label text-xs">Amount (PKR)</label>
                              <input
                                type="number"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="input text-sm"
                                placeholder="0"
                                min="0"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="label text-xs">Description (optional)</label>
                            <input
                              type="text"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="input text-sm"
                              placeholder="Short description..."
                            />
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              onClick={() => setEditingCharge(null)}
                              className="btn-secondary text-xs py-1.5 px-3"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              disabled={savingEdit}
                              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                            >
                              {savingEdit ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Charge row */
                        <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          charge.isActive
                            ? "border-border dark:border-[#1E2D42] bg-white dark:bg-[#111C2E]"
                            : "border-border dark:border-[#1E2D42] bg-bg-main dark:bg-[#0B1222] opacity-60"
                        }`}>
                          <button
                            onClick={() => handleToggleCharge(charge)}
                            className="shrink-0 text-text-muted hover:text-primary transition-colors"
                            title={charge.isActive ? "Deactivate" : "Activate"}
                          >
                            {charge.isActive
                              ? <ToggleRight size={22} className="text-primary" />
                              : <ToggleLeft size={22} />
                            }
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary dark:text-white truncate">{charge.name}</p>
                            {charge.description && (
                              <p className="text-xs text-text-muted truncate">{charge.description}</p>
                            )}
                          </div>
                          <span className="text-sm font-bold text-text-primary dark:text-white shrink-0">
                            {formatCurrency(charge.amount)}
                          </span>
                          <button
                            onClick={() => startEditCharge(charge)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-text-muted hover:text-primary"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCharge(charge.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-text-muted hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new charge form */}
              <div className="pt-2 border-t border-border dark:border-[#1E2D42]">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Add New Charge</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="label text-xs">Name</label>
                    <input
                      type="text"
                      value={newChargeName}
                      onChange={(e) => setNewChargeName(e.target.value)}
                      className="input text-sm"
                      placeholder="e.g. AC Charge, Generator Fee"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Amount (PKR)</label>
                    <input
                      type="number"
                      value={newChargeAmount}
                      onChange={(e) => setNewChargeAmount(e.target.value)}
                      className="input text-sm"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="label text-xs">Description (optional)</label>
                  <input
                    type="text"
                    value={newChargeDescription}
                    onChange={(e) => setNewChargeDescription(e.target.value)}
                    className="input text-sm"
                    placeholder="Short description..."
                  />
                </div>
                <button
                  onClick={handleAddCharge}
                  disabled={addingCharge}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  {addingCharge ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add Charge
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
        <div className="overflow-x-auto">
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
        </div>
      )}

      {/* Billing Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Billing Settings"
        maxWidth="max-w-[560px]"
      >
        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 bg-bg-main dark:bg-[#0B1222] rounded-xl">
          <button
            onClick={() => setSettingsTab("billing")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${settingsTab === "billing" ? "bg-white dark:bg-[#111C2E] text-text-primary dark:text-white shadow-sm" : "text-text-muted hover:text-text-primary"}`}
          >
            Billing & Meals
          </button>
          <button
            onClick={() => setSettingsTab("payment")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${settingsTab === "payment" ? "bg-white dark:bg-[#111C2E] text-text-primary dark:text-white shadow-sm" : "text-text-muted hover:text-text-primary"}`}
          >
            Payment Methods
          </button>
        </div>

        {settingsTab === "payment" ? (
          <div className="space-y-5">
            <p className="text-xs text-text-muted">Residents will see these payment details when viewing their bills. They can scan the QR or transfer manually.</p>

            {/* JazzCash */}
            <div className="p-4 rounded-xl border border-border dark:border-[#1E2D42] space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#CC0000]/10 flex items-center justify-center">
                  <span className="text-[#CC0000] font-bold text-xs">JC</span>
                </div>
                <p className="font-semibold text-sm">JazzCash</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Mobile Number</label>
                  <input type="tel" value={paymentMethods.jazzCashNumber}
                    onChange={(e) => setPaymentMethods(p => ({ ...p, jazzCashNumber: e.target.value.replace(/[^0-9]/g, "").slice(0, 11) }))}
                    className="input text-sm" placeholder="03XXXXXXXXX" maxLength={11} />
                </div>
                <div>
                  <label className="label text-xs">Account Title</label>
                  <input type="text" value={paymentMethods.jazzCashTitle}
                    onChange={(e) => setPaymentMethods(p => ({ ...p, jazzCashTitle: e.target.value }))}
                    className="input text-sm" placeholder="Name on account" />
                </div>
              </div>
            </div>

            {/* EasyPaisa */}
            <div className="p-4 rounded-xl border border-border dark:border-[#1E2D42] space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#00A651]/10 flex items-center justify-center">
                  <span className="text-[#00A651] font-bold text-xs">EP</span>
                </div>
                <p className="font-semibold text-sm">EasyPaisa</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Mobile Number</label>
                  <input type="tel" value={paymentMethods.easyPaisaNumber}
                    onChange={(e) => setPaymentMethods(p => ({ ...p, easyPaisaNumber: e.target.value.replace(/[^0-9]/g, "").slice(0, 11) }))}
                    className="input text-sm" placeholder="03XXXXXXXXX" maxLength={11} />
                </div>
                <div>
                  <label className="label text-xs">Account Title</label>
                  <input type="text" value={paymentMethods.easyPaisaTitle}
                    onChange={(e) => setPaymentMethods(p => ({ ...p, easyPaisaTitle: e.target.value }))}
                    className="input text-sm" placeholder="Name on account" />
                </div>
              </div>
            </div>

            {/* Bank Transfer */}
            <div className="p-4 rounded-xl border border-border dark:border-[#1E2D42] space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-xs">BT</span>
                </div>
                <p className="font-semibold text-sm">Bank Transfer</p>
              </div>
              <div>
                <label className="label text-xs">Bank Name</label>
                <input type="text" value={paymentMethods.bankName}
                  onChange={(e) => setPaymentMethods(p => ({ ...p, bankName: e.target.value }))}
                  className="input text-sm" placeholder="e.g., HBL, MCB, Meezan" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">IBAN</label>
                  <input type="text" value={paymentMethods.bankIBAN}
                    onChange={(e) => setPaymentMethods(p => ({ ...p, bankIBAN: e.target.value.toUpperCase() }))}
                    className="input text-sm font-mono" placeholder="PK00XXXX..." />
                </div>
                <div>
                  <label className="label text-xs">Account Title</label>
                  <input type="text" value={paymentMethods.bankTitle}
                    onChange={(e) => setPaymentMethods(p => ({ ...p, bankTitle: e.target.value }))}
                    className="input text-sm" placeholder="Account holder name" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowSettings(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveSettings} disabled={savingSettings} className="btn-primary flex items-center gap-2">
                {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Settings
              </button>
            </div>
          </div>
        ) : (
        <div className="space-y-5">
          <div>
            <label className="label">Billing Cycle</label>
            <select
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value)}
              className="select"
            >
              <option value="DAILY">Daily (per day — for short stays)</option>
              <option value="WEEKLY">Weekly (every 7 days)</option>
              <option value="BIWEEKLY">Bi-Weekly (every 14 days)</option>
              <option value="MONTHLY">Monthly (full month)</option>
            </select>
            <p className="text-xs text-text-muted mt-1">
              {billingCycle === "DAILY" && "Rent is charged per day: room rate ÷ 30. Best for nightly/short-stay guests."}
              {billingCycle === "WEEKLY" && "Rent is prorated: ~23% of monthly rent per week"}
              {billingCycle === "BIWEEKLY" && "Rent is prorated: ~47% of monthly rent per 2 weeks"}
              {billingCycle === "MONTHLY" && "Full monthly rent charged per billing cycle. Mid-month joiners get prorated bill."}
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
        )}
      </Modal>

      {/* Single Resident Bill Generation Modal */}
      <Modal
        isOpen={showSingleModal}
        onClose={() => setShowSingleModal(false)}
        title="Generate Bill — Specific Residents"
        maxWidth="max-w-[480px]"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Select one or more residents to generate bills for. Useful when a new resident joins mid-cycle or you need to regenerate for a specific person.
          </p>

          <div className="p-3 bg-primary/5 rounded-xl border border-primary/15 text-xs text-primary">
            Period: <strong>{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month-1]} {year}</strong>
            {" · "}{billingCycle} billing
          </div>

          {loadingResidents ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : allResidents.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">No active residents found</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  {allResidents.length} Active Residents
                </span>
                <button
                  onClick={() => setSelectedResidentIds(
                    selectedResidentIds.length === allResidents.length
                      ? []
                      : allResidents.map(r => r.id)
                  )}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  {selectedResidentIds.length === allResidents.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {allResidents.map((r) => {
                  const isSelected = selectedResidentIds.includes(r.id);
                  const hasBill = bills.some(b => b.residentId === r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedResidentIds(prev =>
                        prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id]
                      )}
                      disabled={hasBill}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                        hasBill
                          ? "opacity-40 cursor-not-allowed border-border dark:border-[#1E2D42]"
                          : isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border dark:border-[#1E2D42] hover:border-primary/40"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? "border-primary bg-primary" : "border-text-muted"
                      }`}>
                        {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                      <User size={14} className="text-text-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary dark:text-white truncate">{r.name}</p>
                        <p className="text-[11px] text-text-muted">Room {r.room}</p>
                      </div>
                      {hasBill && <span className="text-[10px] badge-success shrink-0">Bill exists</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowSingleModal(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={handleGenerateForSelected}
              disabled={generating || selectedResidentIds.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              Generate {selectedResidentIds.length > 0 ? `(${selectedResidentIds.length})` : ""} Bills
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
