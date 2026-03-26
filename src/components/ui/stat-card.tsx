"use client";

import { LucideIcon } from "lucide-react";
import React from "react";

interface StatCardProps {
  label?: string;
  title?: string; // alias for label
  value: string | number;
  icon: LucideIcon | React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  color?: string; // alias for iconColor
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
  icon,
  iconBg,
  iconColor,
  color,
  trend,
  delay = 0,
}: StatCardProps) {
  const displayLabel = label || title || "";
  const displayColor = iconColor || color || "#4F46E5";
  const displayBg = iconBg || `${displayColor}15`;

  // Check if icon is a LucideIcon component (function) or a React element
  const isComponent = typeof icon === "function";

  return (
    <div
      className="stat-card opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="stat-icon" style={{ backgroundColor: displayBg }}>
        {isComponent
          ? React.createElement(icon as LucideIcon, {
              size: 24,
              style: { color: displayColor },
            })
          : icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="stat-number">{value}</p>
        <p className="stat-label">{displayLabel}</p>
      </div>
      {trend && (
        <span
          className={`text-xs font-semibold ${
            trend.isUp ? "text-success" : "text-danger"
          }`}
        >
          {trend.isUp ? "+" : "-"}{trend.value}%
        </span>
      )}
    </div>
  );
}
