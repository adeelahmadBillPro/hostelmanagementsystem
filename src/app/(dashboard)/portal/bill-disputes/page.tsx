"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Scale, Loader2 } from "lucide-react";

export default function PortalDisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/disputes")
      .then((r) => r.ok ? r.json() : { disputes: [] })
      .then((data) => setDisputes(data.disputes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      OPEN: "badge-danger",
      UNDER_REVIEW: "badge-warning",
      RESOLVED: "badge-success",
      REJECTED: "badge-secondary",
    };
    return <span className={map[status] || "badge-primary"}>{status.replace("_", " ")}</span>;
  };

  return (
    <DashboardLayout title="Bill Disputes">
      <div className="space-y-6">
        <h1 className="page-title">My Bill Disputes</h1>

        {loading ? (
          <div className="card p-12 flex justify-center">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : disputes.length === 0 ? (
          <div className="card text-center py-16">
            <Scale size={48} className="mx-auto text-text-muted opacity-30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Disputes</h3>
            <p className="text-text-muted text-sm">You haven&apos;t filed any bill disputes. Go to My Bill to dispute a charge.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map((d: any) => (
              <div key={d.id} className="card !p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-text-primary dark:text-white capitalize">{d.category?.replace("_", " ")}</span>
                      {getStatusBadge(d.status)}
                    </div>
                    <p className="text-sm text-text-secondary dark:text-slate-300">{d.description}</p>
                    {d.resolution && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Resolution: {d.resolution}</p>
                    )}
                    <p className="text-[10px] text-text-muted mt-1">Filed: {formatDate(d.createdAt)}</p>
                  </div>
                  {d.bill && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-text-muted">Bill: {d.bill.monthLabel || `${d.bill.month}/${d.bill.year}`}</p>
                      <p className="font-bold">{formatCurrency(d.bill.totalAmount || 0)}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
