"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/ui/stat-card";
import DataTable from "@/components/ui/data-table";
import { formatCurrency, formatDate } from "@/lib/utils";
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
} from "lucide-react";

interface BillData {
  id: string;
  residentId: string;
  month: number;
  year: number;
  roomRent: number;
  foodCharges: number;
  otherCharges: number;
  meterCharges: number;
  parkingFee: number;
  previousBalance: number;
  advanceDeduction: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
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

export default function BillingPage() {
  const params = useParams();
  const router = useRouter();
  const hostelId = params.id as string;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [bills, setBills] = useState<BillData[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalBilled: 0,
    totalCollected: 0,
    totalPending: 0,
    totalOverdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/hostels/${hostelId}/billing?month=${month}&year=${year}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBills(data.bills);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching bills:", error);
    } finally {
      setLoading(false);
    }
  }, [hostelId, month, year]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleGenerateBills = async () => {
    try {
      setGenerating(true);
      const res = await fetch(`/api/hostels/${hostelId}/billing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      const data = await res.json();
      alert(`${data.message}`);
      fetchBills();
    } catch (error) {
      console.error("Error generating bills:", error);
      alert("Failed to generate bills");
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <span className="badge-success">Paid</span>;
      case "PARTIAL":
        return <span className="badge-warning">Partial</span>;
      case "UNPAID":
        return <span className="badge-danger">Unpaid</span>;
      case "OVERDUE":
        return <span className="badge-danger">Overdue</span>;
      default:
        return <span className="badge-primary">{status}</span>;
    }
  };

  const columns = [
    {
      key: "resident",
      label: "Resident",
      render: (row: BillData) => (
        <div>
          <p className="font-medium text-text-primary dark:text-white">
            {row.resident.user.name}
          </p>
          <p className="text-xs text-text-muted">
            Room {row.resident.room.roomNumber}
          </p>
        </div>
      ),
    },
    {
      key: "roomRent",
      label: "Room Rent",
      render: (row: BillData) => formatCurrency(row.roomRent),
    },
    {
      key: "foodCharges",
      label: "Food",
      render: (row: BillData) => formatCurrency(row.foodCharges),
    },
    {
      key: "otherCharges",
      label: "Other",
      render: (row: BillData) =>
        formatCurrency(row.otherCharges + row.meterCharges + row.parkingFee),
    },
    {
      key: "totalAmount",
      label: "Total",
      render: (row: BillData) => (
        <span className="font-semibold">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      key: "paidAmount",
      label: "Paid",
      render: (row: BillData) => (
        <span className="text-green-600 dark:text-green-400">
          {formatCurrency(row.paidAmount)}
        </span>
      ),
    },
    {
      key: "balance",
      label: "Balance",
      render: (row: BillData) => (
        <span className={row.balance > 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
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

  return (
    <DashboardLayout title="Billing Management" hostelId={hostelId}>
      {/* Month/Year selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-text-muted" />
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
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="select"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGenerateBills}
          disabled={generating}
          className="btn-primary flex items-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Plus size={16} />
              Generate Bills
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Billed"
          value={formatCurrency(stats.totalBilled)}
          icon={Receipt}
          iconBg="#EEF2FF"
          iconColor="#4F46E5"
          delay={0}
        />
        <StatCard
          label="Collected"
          value={formatCurrency(stats.totalCollected)}
          icon={DollarSign}
          iconBg="#F0FDF4"
          iconColor="#16A34A"
          delay={100}
        />
        <StatCard
          label="Pending"
          value={formatCurrency(stats.totalPending)}
          icon={Clock}
          iconBg="#FFFBEB"
          iconColor="#D97706"
          delay={200}
        />
        <StatCard
          label="Overdue"
          value={formatCurrency(stats.totalOverdue)}
          icon={AlertTriangle}
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          delay={300}
        />
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
          emptyMessage="No bills found for this period. Click 'Generate Bills' to create bills for active residents."
          onRowClick={(row) =>
            router.push(
              `/hostel/${hostelId}/billing/${row.residentId}?month=${month}&year=${year}`
            )
          }
          actions={(row) => (
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  router.push(
                    `/hostel/${hostelId}/billing/${row.residentId}?month=${month}&year=${year}`
                  )
                }
                className="p-1.5 rounded-lg hover:bg-bg-main transition-colors"
                title="View Detail"
              >
                <Eye size={16} className="text-text-muted" />
              </button>
              <button
                onClick={() =>
                  router.push(
                    `/hostel/${hostelId}/billing/${row.residentId}?month=${month}&year=${year}&pay=true`
                  )
                }
                className="p-1.5 rounded-lg hover:bg-bg-main transition-colors"
                title="Record Payment"
              >
                <CreditCard size={16} className="text-text-muted" />
              </button>
            </div>
          )}
        />
      )}
    </DashboardLayout>
  );
}
