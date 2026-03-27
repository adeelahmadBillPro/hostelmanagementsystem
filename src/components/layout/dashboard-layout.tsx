"use client";

import { useState, useEffect } from "react";
import Sidebar from "./sidebar";
import Header from "./header";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  hostelId?: string;
}

export default function DashboardLayout({
  children,
  title,
  hostelId,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Remember collapse state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setSidebarCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  return (
    <div className="min-h-screen bg-bg-main dark:bg-[#0B1222]">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        hostelId={hostelId}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-0" : "lg:ml-[260px]"
        }`}
      >
        <Header
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
          onToggleCollapse={toggleCollapse}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="p-4 lg:p-6 max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
