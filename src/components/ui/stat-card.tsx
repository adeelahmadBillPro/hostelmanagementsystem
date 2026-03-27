"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  icon: any;
  iconBg?: string;
  iconColor?: string;
  color?: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
  delay?: number;
}

export default function StatCard({
  label,
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  color,
  trend,
  delay = 0,
}: StatCardProps) {
  const displayLabel = label || title || "";
  const displayColor = iconColor || color || "#4F46E5";
  const displayBg = iconBg || `${displayColor}12`;

  const renderIcon = () => {
    if (!Icon) return null;
    if (React.isValidElement(Icon)) return Icon;
    if (typeof Icon === "function" || (typeof Icon === "object" && Icon.$$typeof)) {
      return <Icon size={24} style={{ color: displayColor }} />;
    }
    return null;
  };

  return (
    <div
      className="stat-card opacity-0 animate-fade-in-up group"
      style={{
        animationDelay: `${delay}ms`,
        "--stat-accent": displayColor,
      } as React.CSSProperties}
    >
      <div
        className="stat-icon ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
        style={{ backgroundColor: displayBg }}
      >
        {renderIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="stat-number">{value}</p>
        <p className="stat-label">{displayLabel}</p>
      </div>
      {trend && (
        <div
          className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
            trend.isUp
              ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30"
              : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30"
          }`}
        >
          {trend.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trend.value}%
        </div>
      )}
    </div>
  );
}
