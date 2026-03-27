"use client";

import { BarChart } from "@/components/ui/chart";

interface RevenueChartProps {
  data: { month: string; revenue: number }[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <BarChart
      data={data.map((d) => ({ label: d.month, value: d.revenue }))}
      color="#10B981"
      height={350}
    />
  );
}
