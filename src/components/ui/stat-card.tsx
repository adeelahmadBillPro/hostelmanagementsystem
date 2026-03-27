"use client";

import React from "react";

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
  const displayBg = iconBg || `${displayColor}15`;

  // Determine how to render the icon
  const renderIcon = () => {
    if (!Icon) return null;

    // Already a rendered JSX element (e.g., <Users size={24} />)
    if (React.isValidElement(Icon)) {
      return Icon;
    }

    // A component (function or forwardRef object) - render it
    if (typeof Icon === "function" || (typeof Icon === "object" && Icon.$$typeof)) {
      return <Icon size={24} style={{ color: displayColor }} />;
    }

    return null;
  };

  return (
    <div
      className="stat-card opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="stat-icon" style={{ backgroundColor: displayBg }}>
        {renderIcon()}
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
