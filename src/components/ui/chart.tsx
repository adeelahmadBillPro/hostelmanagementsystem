"use client";

import dynamic from "next/dynamic";
import { Spinner } from "./loading";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[300px]">
      <Spinner />
    </div>
  ),
});

// Shared theme for all charts
const baseTheme = {
  chart: {
    fontFamily: "Inter, sans-serif",
    toolbar: { show: false },
    zoom: { enabled: false },
    background: "transparent",
    animations: {
      enabled: true,
      easing: "easeinout",
      speed: 800,
      animateGradually: { enabled: true, delay: 150 },
      dynamicAnimation: { enabled: true, speed: 350 },
    },
  },
  grid: {
    borderColor: "rgba(148, 163, 184, 0.1)",
    strokeDashArray: 4,
  },
  tooltip: {
    theme: "dark" as const,
    style: { fontSize: "12px" },
    y: { formatter: undefined as any },
  },
  xaxis: {
    labels: {
      style: { colors: "#94A3B8", fontSize: "12px" },
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      style: { colors: "#94A3B8", fontSize: "12px" },
    },
  },
  legend: {
    labels: { colors: "#94A3B8" },
    fontSize: "12px",
  },
  dataLabels: { enabled: false },
};

// ==================== BAR CHART ====================
interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  formatValue?: (val: number) => string;
  title?: string;
  horizontal?: boolean;
}

export function BarChart({
  data,
  color = "#10B981",
  height = 300,
  formatValue = (v) => `PKR ${v.toLocaleString()}`,
  title,
  horizontal = false,
}: BarChartProps) {
  const options: any = {
    ...baseTheme,
    chart: {
      ...baseTheme.chart,
      type: "bar",
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: "50%",
        horizontal,
        distributed: false,
      },
    },
    colors: [color],
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "vertical",
        shadeIntensity: 0.3,
        opacityFrom: 1,
        opacityTo: 0.8,
      },
    },
    xaxis: {
      ...baseTheme.xaxis,
      categories: data.map((d) => d.label),
    },
    yaxis: {
      ...baseTheme.yaxis,
      labels: {
        ...baseTheme.yaxis.labels,
        formatter: (val: number) => {
          if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
          return val.toString();
        },
      },
    },
    tooltip: {
      ...baseTheme.tooltip,
      y: { formatter: formatValue },
    },
    ...(title ? { title: { text: title, style: { color: "#E2E8F0", fontSize: "16px", fontWeight: 600 } } } : {}),
  };

  return (
    <ReactApexChart
      options={options}
      series={[{ name: "Value", data: data.map((d) => d.value) }]}
      type="bar"
      height={height}
    />
  );
}

// ==================== LINE CHART ====================
interface LineChartProps {
  data: { label: string; [key: string]: any }[];
  series: { key: string; name: string; color: string }[];
  height?: number;
  formatValue?: (val: number) => string;
}

export function LineChart({
  data,
  series,
  height = 300,
  formatValue = (v) => `PKR ${v.toLocaleString()}`,
}: LineChartProps) {
  const options: any = {
    ...baseTheme,
    chart: {
      ...baseTheme.chart,
      type: "area",
    },
    colors: series.map((s) => s.color),
    stroke: { curve: "smooth" as const, width: 3 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    xaxis: {
      ...baseTheme.xaxis,
      categories: data.map((d) => d.label),
    },
    yaxis: {
      ...baseTheme.yaxis,
      labels: {
        ...baseTheme.yaxis.labels,
        formatter: (val: number) => {
          if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
          return val.toString();
        },
      },
    },
    tooltip: {
      ...baseTheme.tooltip,
      y: { formatter: formatValue },
    },
  };

  const chartSeries = series.map((s) => ({
    name: s.name,
    data: data.map((d) => d[s.key] || 0),
  }));

  return (
    <ReactApexChart
      options={options}
      series={chartSeries}
      type="area"
      height={height}
    />
  );
}

// ==================== PIE / DONUT CHART ====================
interface PieChartProps {
  data: { label: string; value: number }[];
  colors?: string[];
  height?: number;
  donut?: boolean;
  formatValue?: (val: number) => string;
}

const defaultColors = [
  "#10B981", "#F59E0B", "#EF4444", "#0EA5E9", "#8B5CF6",
  "#F472B6", "#14B8A6", "#FB923C", "#A78BFA", "#34D399",
];

export function PieChart({
  data,
  colors = defaultColors,
  height = 300,
  donut = true,
  formatValue = (v) => `PKR ${v.toLocaleString()}`,
}: PieChartProps) {
  const options: any = {
    chart: {
      ...baseTheme.chart,
      type: donut ? "donut" : "pie",
    },
    labels: data.map((d) => d.label),
    colors: colors.slice(0, data.length),
    legend: {
      ...baseTheme.legend,
      position: "bottom" as const,
    },
    plotOptions: {
      pie: {
        donut: {
          size: "60%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              color: "#94A3B8",
              fontSize: "14px",
              formatter: (w: any) => {
                const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                return formatValue(total);
              },
            },
          },
        },
      },
    },
    tooltip: {
      y: { formatter: formatValue },
    },
    stroke: { show: false },
    dataLabels: {
      enabled: true,
      style: { fontSize: "11px", fontWeight: 600 },
      dropShadow: { enabled: false },
    },
  };

  return (
    <ReactApexChart
      options={options}
      series={data.map((d) => d.value)}
      type={donut ? "donut" : "pie"}
      height={height}
    />
  );
}

// ==================== MULTI BAR CHART ====================
interface MultiBarChartProps {
  data: { label: string; [key: string]: any }[];
  series: { key: string; name: string; color: string }[];
  height?: number;
  formatValue?: (val: number) => string;
  stacked?: boolean;
}

export function MultiBarChart({
  data,
  series,
  height = 300,
  formatValue = (v) => `PKR ${v.toLocaleString()}`,
  stacked = false,
}: MultiBarChartProps) {
  const options: any = {
    ...baseTheme,
    chart: {
      ...baseTheme.chart,
      type: "bar",
      stacked,
    },
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: "55%" },
    },
    colors: series.map((s) => s.color),
    xaxis: {
      ...baseTheme.xaxis,
      categories: data.map((d) => d.label),
    },
    yaxis: {
      ...baseTheme.yaxis,
      labels: {
        ...baseTheme.yaxis.labels,
        formatter: (val: number) => {
          if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
          return val.toString();
        },
      },
    },
    tooltip: {
      ...baseTheme.tooltip,
      y: { formatter: formatValue },
    },
  };

  const chartSeries = series.map((s) => ({
    name: s.name,
    data: data.map((d) => d[s.key] || 0),
  }));

  return (
    <ReactApexChart
      options={options}
      series={chartSeries}
      type="bar"
      height={height}
    />
  );
}

// ==================== RADIAL / GAUGE ====================
interface RadialChartProps {
  value: number;
  label: string;
  color?: string;
  height?: number;
}

export function RadialChart({
  value,
  label,
  color = "#10B981",
  height = 200,
}: RadialChartProps) {
  const options: any = {
    chart: { ...baseTheme.chart, type: "radialBar" },
    plotOptions: {
      radialBar: {
        hollow: { size: "65%" },
        track: { background: "rgba(148,163,184,0.1)" },
        dataLabels: {
          name: {
            show: true,
            color: "#94A3B8",
            fontSize: "13px",
            offsetY: 20,
          },
          value: {
            show: true,
            color: "#E2E8F0",
            fontSize: "28px",
            fontWeight: 700,
            offsetY: -15,
            formatter: (val: number) => `${val}%`,
          },
        },
      },
    },
    colors: [color],
    labels: [label],
    stroke: { lineCap: "round" as const },
  };

  return (
    <ReactApexChart
      options={options}
      series={[value]}
      type="radialBar"
      height={height}
    />
  );
}
