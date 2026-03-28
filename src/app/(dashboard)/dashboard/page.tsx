"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/ui/stat-card";
import { BarChart, PieChart, RadialChart } from "@/components/ui/chart";
import {
  Building2,
  Users,
  Banknote,
  AlertCircle,
  Plus,
  UserPlus,
  FileBarChart,
  MapPin,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BedDouble,
  Receipt,
  Wallet,
  Crown,
  Clock,
  Zap,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface HostelStat {
  id: string;
  name: string;
  type: "GOVERNMENT" | "UNIVERSITY" | "PRIVATE";
  address: string;
  city: string | null;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  activeResidents: number;
  monthlyRevenue: number;
  pendingAmount: number;
}

interface DashboardData {
  stats: {
    totalHostels: number;
    totalResidents: number;
    monthlyRevenue: number;
    pendingPayments: number;
  };
  hostels: HostelStat[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [planStatus, setPlanStatus] = useState<any>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
    // Fetch plan status
    fetch("/api/plan-status")
      .then((r) => r.ok ? r.json() : null)
      .then(setPlanStatus)
      .catch(() => {});
  }, []);

  const fmt = (n: number) => `PKR ${n.toLocaleString()}`;

  const getTypeBadge = (type: string) => {
    if (type === "PRIVATE") return "badge-primary";
    if (type === "UNIVERSITY") return "badge-warning";
    return "badge-success";
  };

  // Calculate totals across all hostels
  const totalBeds = data?.hostels.reduce((s, h) => s + h.totalBeds, 0) || 0;
  const occupiedBeds = data?.hostels.reduce((s, h) => s + h.occupiedBeds, 0) || 0;
  const vacantBeds = data?.hostels.reduce((s, h) => s + h.vacantBeds, 0) || 0;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const totalRevenue = data?.stats.monthlyRevenue || 0;
  const pendingPayments = data?.stats.pendingPayments || 0;

  // Revenue by hostel for chart
  const revenueByHostel = data?.hostels.map((h) => ({
    label: h.name.length > 15 ? h.name.substring(0, 15) + "..." : h.name,
    value: h.monthlyRevenue,
  })) || [];

  // Occupancy by hostel for pie chart
  const occupancyByHostel = data?.hostels.map((h) => ({
    label: h.name.length > 15 ? h.name.substring(0, 15) + "..." : h.name,
    value: h.occupiedBeds,
  })).filter((h) => h.value > 0) || [];

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Plan Status Banner */}
        {planStatus?.plan && (planStatus.plan.trialExpired || (planStatus.plan.isTrial && planStatus.plan.daysLeft !== null && planStatus.plan.daysLeft <= 7)) && (
          <div className={`rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in ${
            planStatus.plan.trialExpired
              ? "bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800"
              : "bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                planStatus.plan.trialExpired ? "bg-red-100 dark:bg-red-900/40" : "bg-amber-100 dark:bg-amber-900/40"
              }`}>
                {planStatus.plan.trialExpired
                  ? <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
                  : <Clock size={20} className="text-amber-600 dark:text-amber-400" />
                }
              </div>
              <div>
                <p className={`text-sm font-bold ${planStatus.plan.trialExpired ? "text-red-800 dark:text-red-300" : "text-amber-800 dark:text-amber-300"}`}>
                  {planStatus.plan.trialExpired
                    ? "Your free trial has expired!"
                    : `Free trial ends in ${planStatus.plan.daysLeft} day(s)`
                  }
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {planStatus.plan.trialExpired
                    ? "Upgrade to continue adding hostels, rooms, and residents."
                    : `Current: ${planStatus.usage.hostels}/${planStatus.limits.maxHostels} hostels, ${planStatus.usage.residents}/${planStatus.limits.maxResidents} residents`
                  }
                </p>
              </div>
            </div>
            <button onClick={() => router.push("/plans")} className="btn-primary !py-2 !px-4 !text-xs flex items-center gap-1.5 flex-shrink-0">
              <Zap size={14} />
              Upgrade Plan
            </button>
          </div>
        )}

        {/* Plan Usage Bar (always show for trial users) */}
        {planStatus?.plan?.isTrial && !planStatus.plan.trialExpired && (
          <div className="card !p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Crown size={16} className="text-amber-500" />
                <span className="text-sm font-bold text-text-primary dark:text-white">{planStatus.plan.name}</span>
                {planStatus.plan.daysLeft !== null && (
                  <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    {planStatus.plan.daysLeft} days left
                  </span>
                )}
              </div>
              <button onClick={() => router.push("/plans")} className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors">
                View Plans →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Hostels", used: planStatus.usage.hostels, max: planStatus.limits.maxHostels, color: "bg-indigo-500" },
                { label: "Residents", used: planStatus.usage.residents, max: planStatus.limits.maxResidents, color: "bg-emerald-500" },
                { label: "Rooms", used: planStatus.usage.rooms, max: planStatus.limits.maxRooms, color: "bg-amber-500" },
                { label: "Staff", used: planStatus.usage.staff, max: planStatus.limits.maxStaff, color: "bg-sky-500" },
              ].map((item) => {
                const pct = Math.min(100, Math.round((item.used / item.max) * 100));
                const isNearLimit = pct >= 80;
                return (
                  <div key={item.label} className="bg-slate-50 dark:bg-[#0B1222] rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-text-muted">{item.label}</span>
                      <span className={`text-[11px] font-bold ${isNearLimit ? "text-red-500" : "text-text-primary dark:text-white"}`}>
                        {item.used}/{item.max}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isNearLimit ? "bg-red-500" : item.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="text-sm text-text-muted mt-1">
              Overview of all your hostel operations
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => router.push("/hostels")} className="btn-primary">
              <Plus size={16} /> Add Hostel
            </button>
            <button onClick={() => router.push("/hostels")} className="btn-secondary">
              <UserPlus size={16} /> Add Resident
            </button>
          </div>
        </div>

        {/* Row 1: Main Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Hostels"
            value={data?.stats.totalHostels ?? 0}
            icon={Building2}
            iconBg="#EEF2FF"
            iconColor="#4F46E5"
            delay={0}
          />
          <StatCard
            label="Total Residents"
            value={data?.stats.totalResidents ?? 0}
            icon={Users}
            iconBg="#ECFDF5"
            iconColor="#10B981"
            delay={100}
          />
          <StatCard
            label="Monthly Revenue"
            value={fmt(totalRevenue)}
            icon={Banknote}
            iconBg="#FFF7ED"
            iconColor="#F59E0B"
            delay={200}
          />
          <StatCard
            label="Pending Payments"
            value={fmt(pendingPayments)}
            icon={AlertCircle}
            iconBg="#FEF2F2"
            iconColor="#EF4444"
            delay={300}
          />
        </div>

        {/* Row 2: Occupancy + Revenue Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Occupancy Gauge */}
          <div className="card opacity-0 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
            <h3 className="font-semibold text-text-primary dark:text-white mb-2">Occupancy Rate</h3>
            <RadialChart value={occupancyRate} label="Occupied" color={occupancyRate > 80 ? "#EF4444" : occupancyRate > 50 ? "#F59E0B" : "#10B981"} height={220} />
            <div className="grid grid-cols-3 gap-2 mt-2 text-center">
              <div>
                <p className="text-lg font-bold text-text-primary dark:text-white">{totalBeds}</p>
                <p className="text-[10px] text-text-muted uppercase">Total Beds</p>
              </div>
              <div>
                <p className="text-lg font-bold text-success">{occupiedBeds}</p>
                <p className="text-[10px] text-text-muted uppercase">Occupied</p>
              </div>
              <div>
                <p className="text-lg font-bold text-warning">{vacantBeds}</p>
                <p className="text-[10px] text-text-muted uppercase">Vacant</p>
              </div>
            </div>
          </div>

          {/* Revenue by Hostel Chart */}
          <div className="card lg:col-span-2 opacity-0 animate-fade-in-up" style={{ animationDelay: "500ms" }}>
            <h3 className="font-semibold text-text-primary dark:text-white mb-2">Revenue by Hostel</h3>
            {revenueByHostel.length > 0 ? (
              <BarChart data={revenueByHostel} color="#10B981" height={280} />
            ) : (
              <div className="flex items-center justify-center h-[280px] text-text-muted text-sm">
                No revenue data yet
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Financial Summary + Occupancy Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Financial Summary Card */}
          <div className="card opacity-0 animate-fade-in-up" style={{ animationDelay: "600ms" }}>
            <h3 className="font-semibold text-text-primary dark:text-white mb-4">Financial Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-success-light dark:bg-emerald-900/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <TrendingUp size={18} className="text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary dark:text-white">Total Revenue</p>
                    <p className="text-xs text-text-muted">This month collected</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-success">{fmt(totalRevenue)}</p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-danger-light dark:bg-red-900/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center">
                    <TrendingDown size={18} className="text-danger" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary dark:text-white">Pending Amount</p>
                    <p className="text-xs text-text-muted">Unpaid bills this month</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-danger">{fmt(pendingPayments)}</p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-primary-light dark:bg-indigo-900/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary dark:text-white">Revenue Potential</p>
                    <p className="text-xs text-text-muted">If all beds occupied</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-primary">
                  {fmt(data?.hostels.reduce((s, h) => s + (h.totalBeds * (h.monthlyRevenue / Math.max(h.occupiedBeds, 1))), 0) || 0)}
                </p>
              </div>

              <div className={`flex items-center justify-between p-3 rounded-xl ${
                totalRevenue > pendingPayments ? "bg-success-light dark:bg-emerald-900/10" : "bg-danger-light dark:bg-red-900/10"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    totalRevenue > pendingPayments ? "bg-success/10" : "bg-danger/10"
                  }`}>
                    <Wallet size={18} className={totalRevenue > pendingPayments ? "text-success" : "text-danger"} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary dark:text-white">Collection Rate</p>
                    <p className="text-xs text-text-muted">Revenue vs Total Billed</p>
                  </div>
                </div>
                <p className={`text-lg font-bold ${totalRevenue > pendingPayments ? "text-success" : "text-danger"}`}>
                  {totalRevenue + pendingPayments > 0
                    ? `${Math.round((totalRevenue / (totalRevenue + pendingPayments)) * 100)}%`
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Occupancy Distribution */}
          <div className="card opacity-0 animate-fade-in-up" style={{ animationDelay: "700ms" }}>
            <h3 className="font-semibold text-text-primary dark:text-white mb-2">Residents by Hostel</h3>
            {occupancyByHostel.length > 0 ? (
              <PieChart
                data={occupancyByHostel}
                height={300}
                formatValue={(v) => `${v} residents`}
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-text-muted text-sm">
                No residents yet
              </div>
            )}
          </div>
        </div>

        {/* Row 4: Hostel Cards */}
        <div>
          <h2 className="section-title mb-4">Your Hostels</h2>
          {data?.hostels.length === 0 ? (
            <div className="card text-center py-12">
              <Building2 size={48} className="mx-auto text-text-muted mb-3" />
              <p className="text-text-muted text-sm">No hostels yet. Add your first hostel to get started.</p>
              <button onClick={() => router.push("/hostels")} className="btn-primary mt-4">
                <Plus size={16} /> Add Hostel
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data?.hostels.map((hostel, i) => {
                const hostelOccupancy = hostel.totalBeds > 0
                  ? Math.round((hostel.occupiedBeds / hostel.totalBeds) * 100)
                  : 0;

                return (
                  <div
                    key={hostel.id}
                    className="card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 opacity-0 animate-fade-in-up"
                    style={{ animationDelay: `${800 + i * 100}ms` }}
                    onClick={() => router.push(`/hostel/${hostel.id}/buildings`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-text-primary dark:text-white truncate">
                          {hostel.name}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
                          <MapPin size={12} />
                          <span className="truncate">{hostel.address}{hostel.city ? `, ${hostel.city}` : ""}</span>
                        </div>
                      </div>
                      <span className={getTypeBadge(hostel.type)}>{hostel.type}</span>
                    </div>

                    {/* Occupancy bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-text-muted">Occupancy</span>
                        <span className="font-semibold text-text-primary dark:text-white">{hostelOccupancy}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-[#0B1222] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            hostelOccupancy > 80 ? "bg-danger" : hostelOccupancy > 50 ? "bg-warning" : "bg-success"
                          }`}
                          style={{ width: `${hostelOccupancy}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-[#0B1222]">
                        <p className="text-lg font-bold text-text-primary dark:text-white">{hostel.totalRooms}</p>
                        <p className="text-[10px] text-text-muted uppercase">Rooms</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-[#0B1222]">
                        <p className="text-lg font-bold text-success">{hostel.occupiedBeds}</p>
                        <p className="text-[10px] text-text-muted uppercase">Occupied</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-[#0B1222]">
                        <p className="text-lg font-bold text-warning">{hostel.vacantBeds}</p>
                        <p className="text-[10px] text-text-muted uppercase">Vacant</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border dark:border-[#1E2D42]">
                      <div>
                        <p className="text-xs text-text-muted">Revenue</p>
                        <p className="text-sm font-bold text-success">{fmt(hostel.monthlyRevenue)}</p>
                      </div>
                      {hostel.pendingAmount > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-text-muted">Pending</p>
                          <p className="text-sm font-bold text-danger">{fmt(hostel.pendingAmount)}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-primary font-medium">
                        Details <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
