"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { LineChart, BarChart, PieChart } from "@/components/ui/chart";

interface AnalyticsData {
  revenueByMonth: { month: string; revenue: number }[];
  tenantsGrowth: { month: string; tenants: number }[];
  planDistribution: { name: string; value: number }[];
}

const PLAN_COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#0EA5E9"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/super-admin/analytics");
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Analytics">
        <div className="card flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Analytics">
        <div className="card text-center py-12">
          <p className="text-text-muted">Failed to load analytics data.</p>
        </div>
      </DashboardLayout>
    );
  }

  const totalRevenue = data.revenueByMonth.reduce((sum, m) => sum + m.revenue, 0);
  const totalNewTenants = data.tenantsGrowth.reduce((sum, m) => sum + m.tenants, 0);
  const totalSubscribed = data.planDistribution.reduce((sum, p) => sum + p.value, 0);

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="text-sm text-text-muted mt-1">
            Platform performance overview for the last 12 months
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            className="card opacity-0 animate-fade-in-up"
            style={{ animationDelay: "0ms" }}
          >
            <p className="text-sm text-text-muted">Total Revenue (12mo)</p>
            <p className="text-2xl font-bold text-text-primary dark:text-white mt-1">
              PKR {totalRevenue.toLocaleString()}
            </p>
          </div>
          <div
            className="card opacity-0 animate-fade-in-up"
            style={{ animationDelay: "100ms" }}
          >
            <p className="text-sm text-text-muted">New Tenants (12mo)</p>
            <p className="text-2xl font-bold text-text-primary dark:text-white mt-1">
              {totalNewTenants}
            </p>
          </div>
          <div
            className="card opacity-0 animate-fade-in-up"
            style={{ animationDelay: "200ms" }}
          >
            <p className="text-sm text-text-muted">Subscribed Tenants</p>
            <p className="text-2xl font-bold text-text-primary dark:text-white mt-1">
              {totalSubscribed}
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Month - LineChart */}
          <div
            className="card opacity-0 animate-fade-in-up"
            style={{ animationDelay: "300ms" }}
          >
            <h2 className="section-title mb-4">Revenue by Month</h2>
            <LineChart
              data={data.revenueByMonth.map((d) => ({ label: d.month, revenue: d.revenue }))}
              series={[{ key: "revenue", name: "Revenue", color: "#4F46E5" }]}
              height={320}
            />
          </div>

          {/* Tenants Growth - BarChart */}
          <div
            className="card opacity-0 animate-fade-in-up"
            style={{ animationDelay: "400ms" }}
          >
            <h2 className="section-title mb-4">Tenants Growth</h2>
            <BarChart
              data={data.tenantsGrowth.map((d) => ({ label: d.month, value: d.tenants }))}
              color="#10B981"
              height={320}
              formatValue={(v) => `${v}`}
            />
          </div>

          {/* Plan Distribution - PieChart */}
          <div
            className="card opacity-0 animate-fade-in-up lg:col-span-2"
            style={{ animationDelay: "500ms" }}
          >
            <h2 className="section-title mb-4">Plan Distribution</h2>
            <PieChart
              data={data.planDistribution.map((d) => ({ label: d.name, value: d.value }))}
              colors={PLAN_COLORS}
              height={360}
              donut
              formatValue={(v) => `${v} tenant${v !== 1 ? "s" : ""}`}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
