"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/ui/stat-card";
import DataTable from "@/components/ui/data-table";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  DollarSign,
  Banknote,
  Landmark,
  Smartphone,
  Calendar,
  Filter,
  Download,
  Loader2,
  CreditCard,
  Search,
} from "lucide-react";

interface PaymentData {
  id: string;
  amount: number;
  method: string;
  date: string;
  receiptNumber: string | null;
  notes: string | null;
  resident: {
    user: { name: string };
    room: { roomNumber: string };
  };
  recordedBy: { name: string };
}

interface Stats {
  totalCollected: number;
  cashTotal: number;
  bankTotal: number;
  digitalTotal: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PaymentsPage() {
  const params = useParams();
  const hostelId = params.id as string;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [methodFilter, setMethodFilter] = useState("");
  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCollected: 0,
    cashTotal: 0,
    bankTotal: 0,
    digitalTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        month: String(month),
        year: String(year),
      });
      if (methodFilter) queryParams.set("method", methodFilter);
      if (search) queryParams.set("search", search);

      const res = await fetch(
        `/api/hostels/${hostelId}/payments?${queryParams.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPayments(data.payments);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  }, [hostelId, month, year, methodFilter, search]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "CASH":
        return <Banknote size={14} className="text-green-600" />;
      case "BANK":
        return <Landmark size={14} className="text-blue-600" />;
      case "JAZZCASH":
        return <Smartphone size={14} className="text-red-600" />;
      case "EASYPAISA":
        return <Smartphone size={14} className="text-green-500" />;
      default:
        return <CreditCard size={14} />;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case "CASH":
        return "Cash";
      case "BANK":
        return "Bank Transfer";
      case "JAZZCASH":
        return "JazzCash";
      case "EASYPAISA":
        return "EasyPaisa";
      default:
        return method;
    }
  };

  const columns = [
    {
      key: "date",
      label: "Date",
      render: (row: PaymentData) => formatDate(row.date),
    },
    {
      key: "resident",
      label: "Resident",
      render: (row: PaymentData) => (
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
      key: "amount",
      label: "Amount",
      render: (row: PaymentData) => (
        <span className="font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: "method",
      label: "Method",
      render: (row: PaymentData) => (
        <div className="flex items-center gap-1.5">
          {getMethodIcon(row.method)}
          <span className="text-sm">{getMethodLabel(row.method)}</span>
        </div>
      ),
    },
    {
      key: "receiptNumber",
      label: "Receipt #",
      render: (row: PaymentData) => (
        <span className="font-mono text-xs text-text-muted">
          {row.receiptNumber || "N/A"}
        </span>
      ),
    },
    {
      key: "recordedBy",
      label: "Recorded By",
      render: (row: PaymentData) => (
        <span className="text-sm text-text-secondary dark:text-gray-400">
          {row.recordedBy.name}
        </span>
      ),
    },
  ];

  const yearOptions = [];
  for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) {
    yearOptions.push(y);
  }

  return (
    <DashboardLayout title="Payments" hostelId={hostelId}>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
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
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-text-muted" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="select"
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank Transfer</option>
              <option value="JAZZCASH">JazzCash</option>
              <option value="EASYPAISA">EasyPaisa</option>
            </select>
          </div>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resident..."
              className="input pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-2" disabled>
            <Download size={16} />
            Export CSV
          </button>
          <button className="btn-secondary flex items-center gap-2" disabled>
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Collected"
          value={formatCurrency(stats.totalCollected)}
          icon={DollarSign}
          iconBg="#F0FDF4"
          iconColor="#16A34A"
          delay={0}
        />
        <StatCard
          label="Cash"
          value={formatCurrency(stats.cashTotal)}
          icon={Banknote}
          iconBg="#ECFDF5"
          iconColor="#059669"
          delay={100}
        />
        <StatCard
          label="Bank Transfer"
          value={formatCurrency(stats.bankTotal)}
          icon={Landmark}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          delay={200}
        />
        <StatCard
          label="JazzCash / EasyPaisa"
          value={formatCurrency(stats.digitalTotal)}
          icon={Smartphone}
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          delay={300}
        />
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="card p-12 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={payments}
          searchable={false}
          emptyMessage="No payments found for this period."
        />
      )}
    </DashboardLayout>
  );
}
