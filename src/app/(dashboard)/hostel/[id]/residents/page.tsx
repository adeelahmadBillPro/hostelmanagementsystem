"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/ui/stat-card";
import DataTable from "@/components/ui/data-table";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { formatCurrency, formatCNIC, formatDate, getInitials } from "@/lib/utils";
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
} from "lucide-react";

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

  const [residents, setResidents] = useState<ResidentData[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalResidents: 0,
    activeResidents: 0,
    checkedOutResidents: 0,
    monthlyCollection: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "ACTIVE" | "CHECKED_OUT">("ALL");
  const [search, setSearch] = useState("");
  const [checkoutResident, setCheckoutResident] = useState<ResidentData | null>(null);
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

        <button
          onClick={() => router.push(`/hostel/${hostelId}/residents/add`)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Add Resident
        </button>
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
            data={residents}
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
                  <button
                    onClick={() => setCheckoutResident(row)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Checkout"
                  >
                    <LogOut size={16} className="text-danger" />
                  </button>
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
    </DashboardLayout>
  );
}
