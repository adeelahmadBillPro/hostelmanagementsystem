"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useToast } from "@/components/providers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Scale, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

interface Dispute {
  id: string;
  category: string;
  description: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  bill: { month: number; year: number; totalAmount: number; balance: number };
  resident: { user: { name: string; email: string } };
  resolvedBy: { name: string } | null;
}

export default function DisputesPage() {
  const params = useParams();
  const hostelId = params.id as string;
  const { addToast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  const fetchDisputes = useCallback(async () => {
    try {
      const res = await fetch(`/api/hostels/${hostelId}/disputes`);
      if (res.ok) {
        const data = await res.json();
        setDisputes(data.disputes || []);
        setStats(data.stats);
      }
    } catch {} finally { setLoading(false); }
  }, [hostelId]);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const updateStatus = async (disputeId: string, status: string, resolution?: string) => {
    try {
      const res = await fetch(`/api/hostels/${hostelId}/disputes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disputeId, status, resolution }),
      });
      if (res.ok) {
        addToast(`Dispute ${status.toLowerCase()}`, "success");
        fetchDisputes();
      } else {
        const data = await res.json();
        addToast(data.error || "Failed", "error");
      }
    } catch { addToast("Failed to update", "error"); }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      OPEN: "badge-warning",
      UNDER_REVIEW: "badge-primary",
      RESOLVED: "badge-success",
      REJECTED: "badge-danger",
    };
    return <span className={map[status] || "badge-secondary"}>{status.replace("_", " ")}</span>;
  };

  return (
    <DashboardLayout title="Bill Disputes" hostelId={hostelId}>
      <div className="space-y-6">
        <h1 className="page-title">Bill Disputes</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, color: "text-primary", bg: "bg-primary/10" },
            { label: "Pending", value: stats.pending, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Resolved", value: stats.resolved, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Rejected", value: stats.rejected, color: "text-red-600", bg: "bg-red-50" },
          ].map((s) => (
            <div key={s.label} className="card !p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="card p-12 flex justify-center">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : disputes.length === 0 ? (
          <div className="card text-center py-16">
            <Scale size={48} className="mx-auto text-text-muted opacity-30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Disputes</h3>
            <p className="text-text-muted text-sm">No bill disputes have been filed yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map((d) => (
              <div key={d.id} className="card !p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-text-primary dark:text-white">{d.resident.user.name}</span>
                      {getStatusBadge(d.status)}
                    </div>
                    <p className="text-sm text-text-muted">
                      Bill: {d.bill.month}/{d.bill.year} | Amount: {formatCurrency(d.bill.totalAmount)} | Category: {d.category}
                    </p>
                    <p className="text-sm text-text-secondary dark:text-slate-300 mt-1">{d.description}</p>
                    {d.resolution && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Resolution: {d.resolution}</p>
                    )}
                    <p className="text-[10px] text-text-muted mt-1">{formatDate(d.createdAt)}</p>
                  </div>
                  {d.status === "OPEN" && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => updateStatus(d.id, "UNDER_REVIEW")} className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1">
                        <Clock size={12} /> Review
                      </button>
                      <button onClick={() => {
                        const res = prompt("Resolution note:");
                        if (res) updateStatus(d.id, "RESOLVED", res);
                      }} className="btn-success !py-1.5 !px-3 !text-xs flex items-center gap-1">
                        <CheckCircle size={12} /> Resolve
                      </button>
                      <button onClick={() => updateStatus(d.id, "REJECTED")} className="btn-danger !py-1.5 !px-3 !text-xs flex items-center gap-1">
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  )}
                  {d.status === "UNDER_REVIEW" && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => {
                        const res = prompt("Resolution note:");
                        if (res) updateStatus(d.id, "RESOLVED", res);
                      }} className="btn-success !py-1.5 !px-3 !text-xs flex items-center gap-1">
                        <CheckCircle size={12} /> Resolve
                      </button>
                      <button onClick={() => updateStatus(d.id, "REJECTED")} className="btn-danger !py-1.5 !px-3 !text-xs flex items-center gap-1">
                        <XCircle size={12} /> Reject
                      </button>
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
