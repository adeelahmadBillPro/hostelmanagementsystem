import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Users, Building2, DollarSign, UserCheck } from "lucide-react";
import StatCard from "@/components/ui/stat-card";
import RevenueChart from "./revenue-chart";

async function getDashboardData() {
  const [totalTenants, activeHostels, totalResidents, recentTenants, monthlyRevenue] =
    await Promise.all([
      prisma.tenant.count(),
      prisma.hostel.count({ where: { status: "ACTIVE" } }),
      prisma.resident.count({ where: { status: "ACTIVE" } }),
      prisma.tenant.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          plan: { select: { name: true } },
          _count: { select: { hostels: true } },
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

  const now = new Date();
  const revenueByMonth = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
      return prisma.payment
        .aggregate({
          _sum: { amount: true },
          where: {
            createdAt: { gte: date, lt: endDate },
          },
        })
        .then((result) => ({
          month: date.toLocaleString("default", { month: "short", year: "2-digit" }),
          revenue: result._sum.amount || 0,
        }));
    })
  );

  return {
    totalTenants,
    activeHostels,
    totalResidents,
    monthlyRevenue: monthlyRevenue._sum.amount || 0,
    recentTenants,
    revenueByMonth,
  };
}

export default async function SuperAdminDashboard() {
  await requireRole(["SUPER_ADMIN"]);
  const data = await getDashboardData();

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
            value={`PKR ${data.monthlyRevenue.toLocaleString()}`}
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
          <div className="p-4 border-b border-border dark:border-[#334155]">
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
                  <th className="table-header">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTenants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-text-muted text-sm"
                    >
                      No tenants found
                    </td>
                  </tr>
                ) : (
                  data.recentTenants.map((tenant) => (
                    <tr key={tenant.id} className="table-row">
                      <td className="table-cell font-medium">{tenant.name}</td>
                      <td className="table-cell">{tenant.email}</td>
                      <td className="table-cell">
                        <span className="badge-primary">
                          {tenant.plan?.name || "No Plan"}
                        </span>
                      </td>
                      <td className="table-cell">{tenant._count.hostels}</td>
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
                      <td className="table-cell">
                        {new Date(tenant.createdAt).toLocaleDateString()}
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
