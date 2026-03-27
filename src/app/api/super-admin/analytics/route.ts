import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
  }

  const now = new Date();

  // Revenue by month (last 12 months)
  const revenueByMonth = await Promise.all(
    Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 1);
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

  // Tenants growth (last 12 months)
  const tenantsGrowth = await Promise.all(
    Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 1);
      return prisma.tenant
        .count({
          where: {
            createdAt: { gte: date, lt: endDate },
          },
        })
        .then((count) => ({
          month: date.toLocaleString("default", { month: "short", year: "2-digit" }),
          tenants: count,
        }));
    })
  );

  // Plan distribution
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { tenants: true } },
    },
  });

  const planDistribution = plans.map((plan) => ({
    name: plan.name,
    value: plan._count.tenants,
  }));

  // Add "No Plan" count
  const noPlanCount = await prisma.tenant.count({ where: { planId: null } });
  if (noPlanCount > 0) {
    planDistribution.push({ name: "No Plan", value: noPlanCount });
  }

  return NextResponse.json({
    revenueByMonth,
    tenantsGrowth,
    planDistribution,
  });
}
