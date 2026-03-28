"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/ui/stat-card";
import DataTable from "@/components/ui/data-table";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { formatCurrency, formatCNIC, formatDate, getInitials } from "@/lib/utils";
import Modal from "@/components/ui/modal";
import {
  Users,
  UserCheck,
  UserX,
  DollarSign,
  Plus,
  Eye,
  Edit,
  LogOut,
  Search,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import { useToast } from "@/components/providers";

interface ResidentData {
  id: string;
  status: string;
  moveInDate: string;
  moveOutDate: string | null;
  advancePaid: number;
  securityDeposit: number;
  gender: string | null;
  institution: string | null;
  photo: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    cnic: string | null;
    image: string | null;
  };
  room: {
    id: string;
    roomNumber: string;
    type: string;
    rentPerBed: number;
    floor: {
      id: string;
      name: string;
      floorNumber: number;
      building: { id: string; name: string };
    };
  };
  bed: {
    id: string;
    bedNumber: string;
    status: string;
  };
}

interface Stats {
  totalResidents: number;
  activeResidents: number;
  checkedOutResidents: number;
  monthlyCollection: number;
}

const AVATAR_COLORS = [
  "#4F46E5",
  "#7C3AED",
  "#DB2777",
  "#DC2626",
  "#EA580C",
  "#D97706",
  "#059669",
  "#0891B2",
  "#2563EB",
  "#4338CA",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ResidentsPage() {
  const params = useParams();
  const router = useRouter();
  const hostelId = params.id as string;
  const { addToast } = useToast();

  const [residents, setResidents] = useState<ResidentData[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalResidents: 0,
    activeResidents: 0,
    checkedOutResidents: 0,
    monthlyCollection: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "ACTIVE" | "CHECKED_OUT">("ALL");
  const [foodFilter, setFoodFilter] = useState<"ALL" | "FULL_MESS" | "NO_MESS" | "CUSTOM">("ALL");
  const [search, setSearch] = useState("");
  const [checkoutResident, setCheckoutResident] = useState<ResidentData | null>(null);
  const [resetCreds, setResetCreds] = useState<{ name: string; email: string; password: string } | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [copied, setCopied] = useState("");

  const handleResetPassword = async (resident: ResidentData) => {
    if (!confirm(`Reset password for ${resident.user.name}?`)) return;
    setResettingId(resident.id);
    try {
      const res = await fetch(`/api/hostels/${hostelId}/residents/${resident.id}/reset-password`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResetCreds(data.credentials);
    } catch (err: any) {
      addToast(err.message || "Failed to reset password", "error");
    } finally {
      setResettingId(null);
    }
  };

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(""), 2000);
  };
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const fetchResidents = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (activeTab !== "ALL") queryParams.set("status", activeTab);
      if (search) queryParams.set("search", search);

      const res = await fetch(
        `/api/hostels/${hostelId}/residents?${queryParams.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setResidents(data.residents);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching residents:", error);
    } finally {
      setLoading(false);
    }
  }, [hostelId, activeTab, search]);

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  const handleCheckout = async () => {
    if (!checkoutResident) return;
    try {
      setCheckoutLoading(true);
      const res = await fetch(
        `/api/hostels/${hostelId}/residents/${checkoutResident.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "checkout" }),
        }
      );
      if (!res.ok) throw new Error("Failed to checkout");
      setCheckoutResident(null);
      fetchResidents();
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const tabs = [
    { key: "ALL" as const, label: "All", count: stats.totalResidents },
    { key: "ACTIVE" as const, label: "Active", count: stats.activeResidents },
    { key: "CHECKED_OUT" as const, label: "Checked Out", count: stats.checkedOutResidents },
  ];

  const columns = [
    {
      key: "photo",
      label: "Resident",
      render: (row: ResidentData) => {
        const initials = getInitials(row.user.name);
        const bgColor = getAvatarColor(row.user.name);
        return (
          <div className="flex items-center gap-3">
            {row.user.image || row.photo ? (
              <img
                src={row.user.image || row.photo || ""}
                alt={row.user.name}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                style={{ backgroundColor: bgColor }}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary dark:text-white truncate">
                {row.user.name}
              </p>
              <p className="text-xs text-text-muted truncate">{row.user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "room",
      label: "Room",
      render: (row: ResidentData) => (
        <span className="text-sm">
          {row.room.floor.building.name} - {row.room.roomNumber}
        </span>
      ),
    },
    {
      key: "bed",
      label: "Bed",
      render: (row: ResidentData) => (
        <span className="text-sm">{row.bed.bedNumber}</span>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (row: ResidentData) => (
        <span className="text-sm">{row.user.phone || "-"}</span>
      ),
    },
    {
      key: "cnic",
      label: "CNIC",
      render: (row: ResidentData) => (
        <span className="text-sm font-mono">
          {row.user.cnic ? formatCNIC(row.user.cnic) : "-"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: ResidentData) => {
        const statusMap: Record<string, { class: string; label: string }> = {
          ACTIVE: { class: "badge-success", label: "Active" },
          CHECKED_OUT: { class: "badge-danger", label: "Checked Out" },
          SUSPENDED: { class: "badge-warning", label: "Suspended" },
        };
        const s = statusMap[row.status] || { class: "badge-primary", label: row.status };
        return <span className={s.class}>{s.label}</span>;
      },
    },
    {
      key: "foodPlan",
      label: "Food",
      render: (row: ResidentData) => {
        const plan = (row as any).foodPlan || "FULL_MESS";
        const planMap: Record<string, { class: string; label: string }> = {
          FULL_MESS: { class: "badge-success", label: "Mess" },
          NO_MESS: { class: "badge-secondary", label: "No Mess" },
          CUSTOM: { class: "badge-warning", label: "Custom" },
        };
        const p = planMap[plan] || { class: "badge-primary", label: plan };
        return <span className={p.class}>{p.label}</span>;
      },
    },
    {
      key: "moveInDate",
      label: "Move-in Date",
      render: (row: ResidentData) => (
        <span className="text-sm">{formatDate(row.moveInDate)}</span>
      ),
    },
  ];

  return (
    <DashboardLayout title="Residents" hostelId={hostelId}>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Residents"
          value={stats.totalResidents}
          icon={Users}
          iconBg="#EEF2FF"
          iconColor="#4F46E5"
          delay={0}
        />
        <StatCard
          label="Active"
          value={stats.activeResidents}
          icon={UserCheck}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          delay={100}
        />
        <StatCard
          label="Checked Out"
          value={stats.checkedOutResidents}
          icon={UserX}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          delay={200}
        />
        <StatCard
          label="This Month's Collection"
          value={formatCurrency(stats.monthlyCollection)}
          icon={DollarSign}
          iconBg="#FFFBEB"
          iconColor="#F59E0B"
          delay={300}
        />
      </div>

      {/* Header with tabs and actions */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 opacity-0 animate-fade-in-up"
        style={{ animationDelay: "400ms" }}
      >
        <div className="flex items-center gap-1 bg-white dark:bg-[#111C2E] rounded-xl p-1 shadow-sm border border-border dark:border-[#1E2D42]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-main dark:hover:bg-[#0B1222]"
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 text-xs ${
                  activeTab === tab.key ? "text-white/80" : "text-text-muted"
                }`}
              >
                ({tab.count})
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={foodFilter}
            onChange={(e) => setFoodFilter(e.target.value as any)}
            className="select !h-10 text-xs !w-auto"
          >
            <option value="ALL">All Plans</option>
            <option value="FULL_MESS">Full Mess</option>
            <option value="NO_MESS">No Mess</option>
            <option value="CUSTOM">Custom</option>
          </select>
          <button
            onClick={() => router.push(`/hostel/${hostelId}/residents/add`)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Resident
          </button>
        </div>
      </div>

      {/* Search */}
      <div
        className="mb-4 opacity-0 animate-fade-in-up"
        style={{ animationDelay: "450ms" }}
      >
        <div className="relative max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, room number, or CNIC..."
            className="input pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="opacity-0 animate-fade-in-up"
        style={{ animationDelay: "500ms" }}
      >
        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={foodFilter === "ALL" ? residents : residents.filter((r: any) => (r.foodPlan || "FULL_MESS") === foodFilter)}
            searchable={false}
            pageSize={10}
            emptyMessage="No residents found"
            onRowClick={(row) =>
              router.push(`/hostel/${hostelId}/residents/${row.id}`)
            }
            actions={(row: ResidentData) => (
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    router.push(`/hostel/${hostelId}/residents/${row.id}`)
                  }
                  className="p-1.5 rounded-lg hover:bg-bg-main dark:hover:bg-[#0B1222] transition-colors"
                  title="View"
                >
                  <Eye size={16} className="text-text-muted" />
                </button>
                <button
                  onClick={() =>
                    router.push(`/hostel/${hostelId}/residents/${row.id}?edit=true`)
                  }
                  className="p-1.5 rounded-lg hover:bg-bg-main dark:hover:bg-[#0B1222] transition-colors"
                  title="Edit"
                >
                  <Edit size={16} className="text-text-muted" />
                </button>
                {row.status === "ACTIVE" && (
                  <>
                    <button
                      onClick={() => handleResetPassword(row)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                      title="Reset Password & Share"
                      disabled={resettingId === row.id}
                    >
                      {resettingId === row.id ? (
                        <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin block" />
                      ) : (
                        <KeyRound size={16} className="text-primary" />
                      )}
                    </button>
                    <button
                      onClick={() => setCheckoutResident(row)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Checkout"
                    >
                      <LogOut size={16} className="text-danger" />
                    </button>
                  </>
                )}
              </div>
            )}
          />
        )}
      </div>

      {/* Checkout Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!checkoutResident}
        onClose={() => setCheckoutResident(null)}
        onConfirm={handleCheckout}
        title="Checkout Resident"
        message={`Are you sure you want to checkout ${checkoutResident?.user.name}? This will mark the resident as checked out, set the move-out date to today, and make their bed available.`}
        confirmText="Checkout"
        confirmVariant="danger"
        loading={checkoutLoading}
      />

      {/* Reset Password Credentials Modal */}
      <Modal
        isOpen={!!resetCreds}
        onClose={() => setResetCreds(null)}
        title="Password Reset Successful"
        maxWidth="max-w-[440px]"
      >
        {resetCreds && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              New credentials for <strong className="text-text-primary dark:text-white">{resetCreds.name}</strong>. Share with the resident.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-[#0B1222] rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Email</p>
                  <p className="text-sm font-medium text-text-primary dark:text-white">{resetCreds.email}</p>
                </div>
                <button onClick={() => copyText(resetCreds.email, "email")} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                  {copied === "email" ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} className="text-text-muted" />}
                </button>
              </div>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-[#0B1222] rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">New Password</p>
                  <p className="text-sm font-mono font-bold text-primary">{resetCreds.password}</p>
                </div>
                <button onClick={() => copyText(resetCreds.password, "pass")} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                  {copied === "pass" ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} className="text-text-muted" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  const msg = encodeURIComponent(
                    `Assalam o Alaikum ${resetCreds.name}! Your HostelHub password has been reset.\n\nLogin: ${window.location.origin}/login\nEmail: ${resetCreds.email}\nNew Password: ${resetCreds.password}\n\nPlease change your password after login.`
                  );
                  window.open(`https://wa.me/?text=${msg}`, "_blank");
                }}
                className="btn-success flex-1 flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </button>
              <button
                onClick={() => {
                  copyText(`Login: ${window.location.origin}/login\nEmail: ${resetCreds.email}\nPassword: ${resetCreds.password}`, "all");
                }}
                className="btn-secondary flex-1"
              >
                {copied === "all" ? "Copied!" : "Copy All"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
