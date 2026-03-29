"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Users, Building2, DollarSign, UserCheck } from "lucide-react";
import StatCard from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import RevenueChart from "./revenue-chart";
import { PageLoader } from "@/components/ui/loading";

interface DashboardData {
  totalTenants: number;
  activeHostels: number;
  totalResidents: number;
  monthlyRevenue: number;
  recentTenants: any[];
  revenueByMonth: { month: string; revenue: number }[];
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super-admin/analytics")
      .then((res) => res.json())
      .then((json) => {
        // Build dashboard data from analytics endpoint
        setData({
          totalTenants: json.tenantGrowth?.reduce((s: number, t: any) => s + t.count, 0) || 0,
          activeHostels: json.planDistribution?.reduce((s: number, p: any) => s + p.value, 0) || 0,
          totalResidents: 0,
          monthlyRevenue: json.monthlyRevenue?.reduce((s: number, m: any) => s + m.revenue, 0) || 0,
          recentTenants: [],
          revenueByMonth: json.monthlyRevenue || [],
        });
      })
      .catch(() => {
        setData({
          totalTenants: 0,
          activeHostels: 0,
          totalResidents: 0,
          monthlyRevenue: 0,
          recentTenants: [],
          revenueByMonth: [],
        });
      })
      .finally(() => setLoading(false));

    // Also fetch tenants for table
    fetch("/api/super-admin/tenants")
      .then((res) => res.json())
      .then((tenants) => {
        if (Array.isArray(tenants)) {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  totalTenants: tenants.length,
                  activeHostels: tenants.reduce((s: number, t: any) => s + (t.hostelCount || 0), 0),
                  recentTenants: tenants.slice(0, 10),
                }
              : prev
          );
        }
      })
      .catch(() => {});
  }, []);

  if (loading) return (
    <DashboardLayout title="Super Admin Dashboard">
      <PageLoader />
    </DashboardLayout>
  );

  if (!data) return null;

  return (
    <DashboardLayout title="Super Admin Dashboard">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Tenants"
            value={data.totalTenants}
            icon={Users}
            iconBg="#EEF2FF"
            iconColor="#4F46E5"
            delay={0}
          />
          <StatCard
            label="Active Hostels"
            value={data.activeHostels}
            icon={Building2}
            iconBg="#ECFDF5"
            iconColor="#10B981"
            delay={100}
          />
          <StatCard
            label="Monthly Revenue"
            value={formatCurrency(data.monthlyRevenue)}
            icon={DollarSign}
            iconBg="#F0F9FF"
            iconColor="#0EA5E9"
            delay={200}
          />
          <StatCard
            label="Total Residents"
            value={data.totalResidents}
            icon={UserCheck}
            iconBg="#FEF2F2"
            iconColor="#EF4444"
            delay={300}
          />
        </div>

        {/* Revenue Chart */}
        <div
          className="card opacity-0 animate-fade-in-up"
          style={{ animationDelay: "400ms" }}
        >
          <h2 className="section-title mb-4">Revenue Overview (Last 6 Months)</h2>
          <RevenueChart data={data.revenueByMonth} />
        </div>

        {/* Recent Signups Table */}
        <div
          className="card p-0 overflow-hidden opacity-0 animate-fade-in-up"
          style={{ animationDelay: "500ms" }}
        >
          <div className="p-4 border-b border-border">
            <h2 className="section-title">Recent Tenant Signups</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Plan</th>
                  <th className="table-header">Hostels</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTenants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-text-muted text-sm"
                    >
                      No tenants found
                    </td>
                  </tr>
                ) : (
                  data.recentTenants.map((tenant: any) => (
                    <tr key={tenant.id} className="table-row">
                      <td className="table-cell font-medium">{tenant.name}</td>
                      <td className="table-cell">{tenant.email}</td>
                      <td className="table-cell">
                        <span className="badge-primary">
                          {tenant.planName || tenant.plan?.name || "No Plan"}
                        </span>
                      </td>
                      <td className="table-cell">{tenant.hostelCount || tenant._count?.hostels || 0}</td>
                      <td className="table-cell">
                        <span
                          className={
                            tenant.status === "ACTIVE"
                              ? "badge-success"
                              : tenant.status === "SUSPENDED"
                              ? "badge-danger"
                              : "badge-warning"
                          }
                        >
                          {tenant.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
