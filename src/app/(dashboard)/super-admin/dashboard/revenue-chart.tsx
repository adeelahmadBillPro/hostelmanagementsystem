"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RevenueChartProps {
  data: { month: string; revenue: number }[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "#64748B" }}
            axisLine={{ stroke: "#E2E8F0" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#64748B" }}
            axisLine={{ stroke: "#E2E8F0" }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: any) => [`PKR ${Number(value).toLocaleString()}`, "Revenue"]}
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              fontSize: "13px",
            }}
          />
          <Bar dataKey="revenue" fill="#4F46E5" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
