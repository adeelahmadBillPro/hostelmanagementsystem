"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface AnalyticsData {
  revenueByMonth: { month: string; revenue: number }[];
  tenantsGrowth: { month: string; tenants: number }[];
  planDistribution: { name: string; value: number }[];
}

const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#0EA5E9"];

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
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.revenueByMonth}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={{ stroke: "#E2E8F0" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => [
                      `PKR ${Number(value).toLocaleString()}`,
                      "Revenue",
                    ]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4F46E5"
                    strokeWidth={2.5}
                    dot={{ fill: "#4F46E5", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tenants Growth - BarChart */}
          <div
            className="card opacity-0 animate-fade-in-up"
            style={{ animationDelay: "400ms" }}
          >
            <h2 className="section-title mb-4">Tenants Growth</h2>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.tenantsGrowth}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={{ stroke: "#E2E8F0" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(value: any) => [value, "New Tenants"]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Bar
                    dataKey="tenants"
                    fill="#10B981"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plan Distribution - PieChart */}
          <div
            className="card opacity-0 animate-fade-in-up lg:col-span-2"
            style={{ animationDelay: "500ms" }}
          >
            <h2 className="section-title mb-4">Plan Distribution</h2>
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={130}
                    paddingAngle={4}
                    dataKey="value"
                    label={(props: any) =>
                      `${props.name} (${((props.percent || 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {data.planDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      `${value} tenant${value !== 1 ? "s" : ""}`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-sm text-text-secondary">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
