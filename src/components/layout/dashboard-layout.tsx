"use client";

import { useState } from "react";
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

  return (
    <div className="min-h-screen bg-bg-main dark:bg-[#0F172A]">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        hostelId={hostelId}
      />
      <div className="lg:ml-[260px]">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 lg:p-6 max-w-[1280px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
