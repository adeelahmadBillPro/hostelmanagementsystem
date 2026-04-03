"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useToast } from "@/components/providers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Scale, CheckCircle, XCircle, Clock, Loader2, Edit3, X } from "lucide-react";

interface BillDetail {
  id: string;
  month: number;
  year: number;
  totalAmount: number;
  balance: number;
  roomRent: number;
  foodCharges: number;
  otherCharges: number;
  meterCharges: number;
  parkingFee: number;
  discount: number;
  discountReason: string | null;
  notes: string | null;
  dueDate: string | null;
}

interface Dispute {
  id: string;
  category: string;
  description: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  bill: BillDetail;
  resident: { id: string; user: { name: string; email: string } };
  resolvedBy: { name: string } | null;
}

interface AdjustForm {
  roomRent: string;
  foodCharges: string;
  otherCharges: string;
  meterCharges: string;
  parkingFee: string;
  discount: string;
  discountReason: string;
  notes: string;
  resolution: string;
}

export default function DisputesPage() {
  const params = useParams();
  const hostelId = params.id as string;
  const { addToast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [adjustDispute, setAdjustDispute] = useState<Dispute | null>(null);
  const [adjustForm, setAdjustForm] = useState<AdjustForm | null>(null);
  const [saving, setSaving] = useState(false);

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
        addToast(`Dispute ${status.toLowerCase().replace("_", " ")}`, "success");
        fetchDisputes();
      } else {
        const data = await res.json();
        addToast(data.error || "Failed", "error");
      }
    } catch { addToast("Failed to update", "error"); }
  };

  const openAdjustModal = (dispute: Dispute) => {
    setAdjustDispute(dispute);
    setAdjustForm({
      roomRent: String(dispute.bill.roomRent),
      foodCharges: String(dispute.bill.foodCharges),
      otherCharges: String(dispute.bill.otherCharges),
      meterCharges: String(dispute.bill.meterCharges),
      parkingFee: String(dispute.bill.parkingFee),
      discount: String(dispute.bill.discount),
      discountReason: dispute.bill.discountReason || "",
      notes: dispute.bill.notes || "",
      resolution: "",
    });
  };

  const handleAdjustSave = async () => {
    if (!adjustDispute || !adjustForm) return;
    if (!adjustForm.resolution.trim()) {
      addToast("Resolution note is required", "error");
      return;
    }
    setSaving(true);
    try {
      // Step 1: Update the bill
      const billRes = await fetch(
        `/api/hostels/${hostelId}/billing/${adjustDispute.resident.id}/edit`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billId: adjustDispute.bill.id,
            roomRent: parseFloat(adjustForm.roomRent) || 0,
            foodCharges: parseFloat(adjustForm.foodCharges) || 0,
            otherCharges: parseFloat(adjustForm.otherCharges) || 0,
            meterCharges: parseFloat(adjustForm.meterCharges) || 0,
            parkingFee: parseFloat(adjustForm.parkingFee) || 0,
            discount: parseFloat(adjustForm.discount) || 0,
            discountReason: adjustForm.discountReason || null,
            notes: adjustForm.notes || null,
          }),
        }
      );
      if (!billRes.ok) {
        const d = await billRes.json();
        addToast(d.error || "Failed to update bill", "error");
        setSaving(false);
        return;
      }

      // Step 2: Resolve dispute
      await updateStatus(adjustDispute.id, "RESOLVED", adjustForm.resolution);
      setAdjustDispute(null);
      setAdjustForm(null);
      addToast("Bill adjusted and dispute resolved", "success");
    } catch {
      addToast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
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

  const calcPreview = () => {
    if (!adjustForm || !adjustDispute) return null;
    const roomRent = parseFloat(adjustForm.roomRent) || 0;
    const foodCharges = parseFloat(adjustForm.foodCharges) || 0;
    const otherCharges = parseFloat(adjustForm.otherCharges) || 0;
    const meterCharges = parseFloat(adjustForm.meterCharges) || 0;
    const parkingFee = parseFloat(adjustForm.parkingFee) || 0;
    const discount = parseFloat(adjustForm.discount) || 0;
    const total = Math.max(0, roomRent + foodCharges + otherCharges + meterCharges + parkingFee - discount);
    return total;
  };

  return (
    <DashboardLayout title="Bill Disputes" hostelId={hostelId}>
      <div className="space-y-6">
        <h1 className="page-title">Bill Disputes</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, color: "text-primary", bg: "bg-primary/10" },
            { label: "Pending", value: stats.pending, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
            { label: "Resolved", value: stats.resolved, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "Rejected", value: stats.rejected, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
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
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-text-primary dark:text-white">{d.resident.user.name}</span>
                      {getStatusBadge(d.status)}
                    </div>
                    <p className="text-sm text-text-muted">
                      Bill: {d.bill.month}/{d.bill.year} &bull; Amount: <strong>{formatCurrency(d.bill.totalAmount)}</strong> &bull; Category: {d.category}
                    </p>
                    <p className="text-sm text-text-secondary dark:text-slate-300 mt-1">{d.description}</p>
                    {d.resolution && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        Resolution: {d.resolution}
                        {d.resolvedBy && <span className="text-text-muted"> — by {d.resolvedBy.name}</span>}
                      </p>
                    )}
                    <p className="text-[10px] text-text-muted mt-1">{formatDate(d.createdAt)}</p>
                  </div>

                  {(d.status === "OPEN" || d.status === "UNDER_REVIEW") && (
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      {d.status === "OPEN" && (
                        <button
                          onClick={() => updateStatus(d.id, "UNDER_REVIEW")}
                          className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1"
                        >
                          <Clock size={12} /> Review
                        </button>
                      )}
                      <button
                        onClick={() => openAdjustModal(d)}
                        className="btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-1"
                      >
                        <Edit3 size={12} /> Adjust & Resolve
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Reject this dispute?")) updateStatus(d.id, "REJECTED");
                        }}
                        className="btn-danger !py-1.5 !px-3 !text-xs flex items-center gap-1"
                      >
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

      {/* Adjust Bill Modal */}
      {adjustDispute && adjustForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111C2E] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-[#1E2D42]">
              <div>
                <h2 className="text-base font-semibold text-text-primary dark:text-white">Adjust Bill & Resolve</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  {adjustDispute.resident.user.name} — {adjustDispute.bill.month}/{adjustDispute.bill.year}
                </p>
              </div>
              <button onClick={() => setAdjustDispute(null)} className="p-2 rounded-lg hover:bg-bg-main dark:hover:bg-[#0B1222]">
                <X size={18} className="text-text-muted" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Dispute reason */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl p-3">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Resident&apos;s Complaint</p>
                <p className="text-sm text-amber-800 dark:text-amber-300">{adjustDispute.description}</p>
              </div>

              {/* Bill fields */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "roomRent", label: "Room Rent" },
                  { key: "foodCharges", label: "Food Charges" },
                  { key: "otherCharges", label: "Other Charges" },
                  { key: "meterCharges", label: "Meter Charges" },
                  { key: "parkingFee", label: "Parking Fee" },
                  { key: "discount", label: "Discount" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
                    <input
                      type="number"
                      min="0"
                      value={adjustForm[key as keyof AdjustForm]}
                      onChange={(e) => setAdjustForm({ ...adjustForm, [key]: e.target.value })}
                      className="input !py-2 !text-sm"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Discount Reason</label>
                <input
                  type="text"
                  value={adjustForm.discountReason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, discountReason: e.target.value })}
                  placeholder="e.g., Billing error correction"
                  className="input !py-2 !text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Bill Notes</label>
                <input
                  type="text"
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  placeholder="Optional note for resident"
                  className="input !py-2 !text-sm"
                />
              </div>

              {/* New total preview */}
              <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm text-text-secondary dark:text-slate-300">New Bill Total</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(calcPreview() ?? 0)}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Resolution Note <span className="text-danger">*</span>
                </label>
                <textarea
                  value={adjustForm.resolution}
                  onChange={(e) => setAdjustForm({ ...adjustForm, resolution: e.target.value })}
                  placeholder="Explain what was adjusted and why..."
                  rows={2}
                  className="input !py-2 !text-sm resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setAdjustDispute(null)}
                  className="btn-secondary flex-1"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustSave}
                  disabled={saving}
                  className="btn-success flex-1 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  {saving ? "Saving..." : "Save & Resolve"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
