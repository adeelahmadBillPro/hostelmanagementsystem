"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/ui/stat-card";
import {
  Building2,
  Users,
  Banknote,
  AlertCircle,
  Plus,
  UserPlus,
  FileBarChart,
  MapPin,
  BedDouble,
  ArrowRight,
} from "lucide-react";

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

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "PRIVATE":
        return "badge-primary";
      case "UNIVERSITY":
        return "badge-warning";
      case "GOVERNMENT":
        return "badge-success";
      default:
        return "badge-primary";
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="text-sm text-text-muted mt-1">
              Overview of your hostel operations
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/hostels")}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              Add Hostel
            </button>
            <button
              onClick={() => router.push("/residents")}
              className="btn-secondary flex items-center gap-2"
            >
              <UserPlus size={18} />
              Add Resident
            </button>
            <button
              onClick={() => router.push("/reports")}
              className="btn-secondary flex items-center gap-2"
            >
              <FileBarChart size={18} />
              View Reports
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            value={formatCurrency(data?.stats.monthlyRevenue ?? 0)}
            icon={Banknote}
            iconBg="#FFF7ED"
            iconColor="#F59E0B"
            delay={200}
          />
          <StatCard
            label="Pending Payments"
            value={formatCurrency(data?.stats.pendingPayments ?? 0)}
            icon={AlertCircle}
            iconBg="#FEF2F2"
            iconColor="#EF4444"
            delay={300}
          />
        </div>

        {/* Hostels List */}
        <div>
          <h2 className="section-title mb-4">Your Hostels</h2>
          {data?.hostels.length === 0 ? (
            <div className="card text-center py-12">
              <Building2
                size={48}
                className="mx-auto text-text-muted mb-3"
              />
              <p className="text-text-muted text-sm">
                No hostels found. Add your first hostel to get started.
              </p>
              <button
                onClick={() => router.push("/hostels")}
                className="btn-primary mt-4 inline-flex items-center gap-2"
              >
                <Plus size={18} />
                Add Hostel
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data?.hostels.map((hostel, index) => (
                <div
                  key={hostel.id}
                  className="card cursor-pointer hover:shadow-lg transition-all duration-200 opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${400 + index * 100}ms` }}
                  onClick={() =>
                    router.push(`/hostel/${hostel.id}/buildings`)
                  }
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-primary dark:text-white truncate">
                        {hostel.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
                        <MapPin size={12} />
                        <span className="truncate">
                          {hostel.address}
                          {hostel.city ? `, ${hostel.city}` : ""}
                        </span>
                      </div>
                    </div>
                    <span className={getTypeBadgeClass(hostel.type)}>
                      {hostel.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center p-2 rounded-lg bg-bg-main dark:bg-[#0F172A]">
                      <p className="text-lg font-bold text-text-primary dark:text-white">
                        {hostel.totalRooms}
                      </p>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">
                        Rooms
                      </p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-bg-main dark:bg-[#0F172A]">
                      <p className="text-lg font-bold text-success">
                        {hostel.occupiedBeds}
                      </p>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">
                        Occupied
                      </p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-bg-main dark:bg-[#0F172A]">
                      <p className="text-lg font-bold text-warning">
                        {hostel.vacantBeds}
                      </p>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">
                        Vacant
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border dark:border-[#334155]">
                    <div>
                      <p className="text-xs text-text-muted">Revenue</p>
                      <p className="text-sm font-semibold text-text-primary dark:text-white">
                        {formatCurrency(hostel.monthlyRevenue)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-primary font-medium">
                      View Details
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
