"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/ui/stat-card";
import DataTable from "@/components/ui/data-table";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ShoppingBag,
  DollarSign,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Calendar,
  Search,
  Loader2,
  Filter,
} from "lucide-react";

interface OrderData {
  id: string;
  quantity: number;
  totalAmount: number;
  orderDate: string;
  createdAt: string;
  resident: {
    user: { name: string };
  };
  menu: {
    itemName: string;
    mealType: string;
    rate: number;
  };
}

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  breakfastRevenue: number;
  lunchRevenue: number;
  dinnerRevenue: number;
  snackRevenue: number;
}

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

const MEAL_ICONS: Record<string, React.ReactNode> = {
  BREAKFAST: <Coffee size={14} className="text-amber-600" />,
  LUNCH: <Sun size={14} className="text-blue-600" />,
  DINNER: <Moon size={14} className="text-purple-600" />,
  SNACK: <Cookie size={14} className="text-green-600" />,
};

export default function FoodOrdersPage() {
  const params = useParams();
  const hostelId = params.id as string;

  const today = new Date().toISOString().split("T")[0];
  const [dateFilter, setDateFilter] = useState(today);
  const [residentSearch, setResidentSearch] = useState("");
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    breakfastRevenue: 0,
    lunchRevenue: 0,
    dinnerRevenue: 0,
    snackRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (dateFilter) queryParams.set("date", dateFilter);

      const res = await fetch(
        `/api/hostels/${hostelId}/food/orders?${queryParams.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOrders(data.orders);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, [hostelId, dateFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Client-side resident search filtering
  const filteredOrders = residentSearch
    ? orders.filter((o) =>
        o.resident.user.name.toLowerCase().includes(residentSearch.toLowerCase())
      )
    : orders;

  const columns = [
    {
      key: "orderDate",
      label: "Date",
      render: (row: OrderData) => formatDate(row.orderDate),
    },
    {
      key: "resident",
      label: "Resident",
      render: (row: OrderData) => (
        <span className="font-medium text-text-primary dark:text-white">
          {row.resident.user.name}
        </span>
      ),
    },
    {
      key: "mealType",
      label: "Meal",
      render: (row: OrderData) => (
        <div className="flex items-center gap-1.5">
          {MEAL_ICONS[row.menu.mealType]}
          <span>{MEAL_LABELS[row.menu.mealType]}</span>
        </div>
      ),
    },
    {
      key: "item",
      label: "Item",
      render: (row: OrderData) => row.menu.itemName,
    },
    {
      key: "quantity",
      label: "Qty",
      render: (row: OrderData) => row.quantity,
    },
    {
      key: "totalAmount",
      label: "Total",
      render: (row: OrderData) => (
        <span className="font-semibold">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      key: "time",
      label: "Time",
      render: (row: OrderData) =>
        new Date(row.createdAt).toLocaleTimeString("en-PK", {
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
  ];

  return (
    <DashboardLayout title="Food Orders" hostelId={hostelId}>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Orders"
          value={stats.totalOrders}
          icon={ShoppingBag}
          iconBg="#EEF2FF"
          iconColor="#4F46E5"
          delay={0}
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          iconBg="#F0FDF4"
          iconColor="#16A34A"
          delay={100}
        />
        <StatCard
          label="Breakfast / Lunch"
          value={`${formatCurrency(stats.breakfastRevenue)} / ${formatCurrency(stats.lunchRevenue)}`}
          icon={Coffee}
          iconBg="#FFFBEB"
          iconColor="#D97706"
          delay={200}
        />
        <StatCard
          label="Dinner / Snack"
          value={`${formatCurrency(stats.dinnerRevenue)} / ${formatCurrency(stats.snackRevenue)}`}
          icon={Moon}
          iconBg="#F5F3FF"
          iconColor="#7C3AED"
          delay={300}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-text-muted" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="input"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={residentSearch}
            onChange={(e) => setResidentSearch(e.target.value)}
            placeholder="Filter by resident..."
            className="input pl-9"
          />
        </div>
        <button
          onClick={() => {
            setDateFilter("");
            setResidentSearch("");
          }}
          className="btn-secondary text-sm"
        >
          Clear Filters
        </button>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="card p-12 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredOrders}
          searchable={false}
          emptyMessage="No food orders found for the selected date."
        />
      )}
    </DashboardLayout>
  );
}
