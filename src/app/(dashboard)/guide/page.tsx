"use client";

import DashboardLayout from "@/components/layout/dashboard-layout";
import { Download, FileText, Printer } from "lucide-react";

export default function GuidePage() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout title="System Guide">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">HostelHub Guide</h1>
            <p className="text-sm text-text-muted mt-1">
              Complete system documentation. Print or save as PDF.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn-primary">
              <Download size={16} /> Save as PDF
            </button>
          </div>
        </div>

        <div className="card text-center py-8">
          <FileText size={48} className="mx-auto text-primary mb-4" />
          <h2 className="text-xl font-bold text-text-primary dark:text-white mb-2">
            Download Complete Guide
          </h2>
          <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
            Click the button below to open the full system guide in a new tab.
            Then press <strong>Ctrl+P</strong> and select <strong>&quot;Save as PDF&quot;</strong> to download.
          </p>
          <button
            onClick={handlePrint}
            className="btn-primary text-lg px-8 py-3"
          >
            <Printer size={20} /> Print / Save as PDF
          </button>
        </div>

        {/* Inline guide content for printing */}
        <div className="print:block">
          <div className="card space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">1. System Overview</h2>
              <p className="text-text-secondary dark:text-slate-300">
                HostelHub is a complete multi-tenant hostel management SaaS platform for Pakistan.
                It supports government, university, and private hostels with PKR currency, CNIC validation,
                and local payment methods (JazzCash, EasyPaisa).
              </p>
              <div className="mt-4 p-4 bg-success-light dark:bg-emerald-900/10 rounded-xl">
                <strong>Key Numbers:</strong> 150+ files | 35,000+ lines | 28 database tables | 25+ modules | 5 user roles
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">2. User Roles</h2>
              <div className="space-y-3">
                <div className="p-4 border border-border dark:border-[#1E2D42] rounded-xl">
                  <span className="badge-primary mb-2 inline-block">Super Admin</span>
                  <p className="text-sm text-text-secondary dark:text-slate-300">Platform owner. Manages tenants, subscription plans, analytics.</p>
                </div>
                <div className="p-4 border border-border dark:border-[#1E2D42] rounded-xl">
                  <span className="badge-success mb-2 inline-block">Tenant Admin</span>
                  <p className="text-sm text-text-secondary dark:text-slate-300">Hostel owner. Manages multiple hostels, full access to all modules.</p>
                </div>
                <div className="p-4 border border-border dark:border-[#1E2D42] rounded-xl">
                  <span className="badge-warning mb-2 inline-block">Manager</span>
                  <p className="text-sm text-text-secondary dark:text-slate-300">Day-to-day operations for assigned hostel(s).</p>
                </div>
                <div className="p-4 border border-border dark:border-[#1E2D42] rounded-xl">
                  <span className="badge-danger mb-2 inline-block">Resident</span>
                  <p className="text-sm text-text-secondary dark:text-slate-300">Portal access: view bills, order food, messages, complaints.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">3. Complete Module List</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "Building / Floor / Room / Bed Management",
                  "Visual Room Grid with Bed Icons",
                  "Map / Floor Plan View",
                  "Resident Registration (3-step form)",
                  "Food Menu with Free Item Logic",
                  "Food Ordering with Live Calculator",
                  "Monthly Billing (Auto-generated)",
                  "Itemized Bill Breakdown",
                  "Payment Recording (Cash/Bank/JazzCash/EasyPaisa)",
                  "Payment Proof Upload + Approval",
                  "Bill Dispute System",
                  "Staff Management + Salary Tracking",
                  "Expense Tracking + P&L Reports",
                  "Visitor Log with Time In/Out",
                  "Complaint System with Status Tracking",
                  "Gate Pass / Leave Management",
                  "Notice Board",
                  "In-App Messaging with File Attachments",
                  "Hostel Amenities / Facilities Profile",
                  "Notification System (Bell Icon)",
                  "Profile Settings + Photo Upload",
                  "Excel Import (Residents, Rooms, Menu)",
                  "Excel Export (All Reports)",
                  "Bulk Operations (Pay, Checkout, Notify)",
                  "Meter Reading Management",
                  "ApexCharts Analytics Dashboard",
                  "Dark Mode Support",
                  "Rate Limiting + Zod Validation",
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-text-secondary dark:text-slate-300">
                    <span className="text-success">✓</span> {m}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">4. Demo Accounts</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="table-header">Role</th>
                    <th className="table-header">Email</th>
                    <th className="table-header">Password</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="table-row"><td className="table-cell">Super Admin</td><td className="table-cell">admin@hostelhub.com</td><td className="table-cell">password123</td></tr>
                  <tr className="table-row"><td className="table-cell">Tenant Admin</td><td className="table-cell">tenant@hostelhub.com</td><td className="table-cell">password123</td></tr>
                  <tr className="table-row"><td className="table-cell">Manager</td><td className="table-cell">manager@hostelhub.com</td><td className="table-cell">password123</td></tr>
                  <tr className="table-row"><td className="table-cell">Resident</td><td className="table-cell">resident@hostelhub.com</td><td className="table-cell">password123</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
