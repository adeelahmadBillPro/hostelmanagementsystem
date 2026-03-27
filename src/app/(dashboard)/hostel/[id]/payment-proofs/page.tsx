"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/ui/stat-card";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/providers";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Loader2,
  Search,
  Ban,
  Banknote,
  Building,
  Smartphone,
  User,
  FileText,
  DoorOpen,
  Calendar,
} from "lucide-react";

interface PaymentProof {
  id: string;
  amount: number;
  method: string;
  transactionId: string | null;
  proofImageUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  resident: {
    id: string;
    user: { name: string; email: string };
    room: { roomNumber: string } | null;
  };
  bill: {
    id: string;
    month: number;
    year: number;
    totalAmount: number;
    paidAmount: number;
    balance: number;
    status: string;
  };
  reviewedBy: { name: string } | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const METHOD_INFO: Record<string, { label: string; icon: any; color: string }> = {
  CASH: { label: "Cash", icon: Banknote, color: "#22C55E" },
  BANK: { label: "Bank Transfer", icon: Building, color: "#3B82F6" },
  JAZZCASH: { label: "JazzCash", icon: Smartphone, color: "#EF4444" },
  EASYPAISA: { label: "EasyPaisa", icon: CreditCard, color: "#22C55E" },
};

export default function PaymentProofsPage() {
  const params = useParams();
  const hostelId = params.id as string;
  const { addToast } = useToast();

  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject modal state
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectProofId, setRejectProofId] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchProofs();
  }, [hostelId]);

  const fetchProofs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hostels/${hostelId}/payment-proofs`);
      if (res.ok) {
        const data = await res.json();
        setProofs(Array.isArray(data) ? data : []);
      }
    } catch {
      addToast("Failed to load payment proofs", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (proofId: string) => {
    try {
      setActionLoading(proofId);
      const res = await fetch(`/api/hostels/${hostelId}/payment-proofs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofId, action: "approve" }),
      });

      if (res.ok) {
        addToast("Payment proof approved!", "success");
        fetchProofs();
      } else {
        const err = await res.json();
        addToast(err.error || "Failed to approve", "error");
      }
    } catch {
      addToast("Something went wrong", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (proofId: string) => {
    setRejectProofId(proofId);
    setRejectReason("");
    setRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      addToast("Please enter a rejection reason", "error");
      return;
    }

    try {
      setActionLoading(rejectProofId);
      const res = await fetch(`/api/hostels/${hostelId}/payment-proofs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proofId: rejectProofId,
          action: "reject",
          rejectionReason: rejectReason,
        }),
      });

      if (res.ok) {
        addToast("Payment proof rejected", "warning");
        setRejectModal(false);
        fetchProofs();
      } else {
        const err = await res.json();
        addToast(err.error || "Failed to reject", "error");
      }
    } catch {
      addToast("Something went wrong", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Stats
  const pendingCount = proofs.filter((p) => p.status === "PENDING").length;
  const today = new Date().toDateString();
  const approvedToday = proofs.filter(
    (p) => p.status === "APPROVED" && p.reviewedAt && new Date(p.reviewedAt).toDateString() === today
  ).length;
  const totalReceived = proofs
    .filter((p) => p.status === "APPROVED")
    .reduce((sum, p) => sum + p.amount, 0);

  // Filter
  const filtered = proofs
    .filter((p) => p.status === activeTab)
    .filter((p) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.resident.user.name.toLowerCase().includes(q) ||
        p.resident.room?.roomNumber.toLowerCase().includes(q) ||
        p.transactionId?.toLowerCase().includes(q)
      );
    });

  const tabs = [
    { key: "PENDING" as const, label: "Pending", count: proofs.filter((p) => p.status === "PENDING").length, color: "text-amber-500" },
    { key: "APPROVED" as const, label: "Approved", count: proofs.filter((p) => p.status === "APPROVED").length, color: "text-green-500" },
    { key: "REJECTED" as const, label: "Rejected", count: proofs.filter((p) => p.status === "REJECTED").length, color: "text-red-500" },
  ];

  return (
    <DashboardLayout title="Payment Proofs" hostelId={hostelId}>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Pending Review"
          value={pendingCount}
          icon={Clock}
          iconColor="#F59E0B"
          delay={0}
        />
        <StatCard
          label="Approved Today"
          value={approvedToday}
          icon={CheckCircle2}
          iconColor="#22C55E"
          delay={100}
        />
        <StatCard
          label="Total Received"
          value={formatCurrency(totalReceived)}
          icon={Banknote}
          iconColor="#3B82F6"
          delay={200}
        />
      </div>

      {/* Tabs + Search */}
      <div className="card mb-6 animate-fade-in" style={{ animationDelay: "150ms" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-1 bg-bg-main dark:bg-[#0B1222] rounded-xl p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "bg-white dark:bg-[#111C2E] text-text-primary dark:text-white shadow-sm"
                    : "text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white"
                }`}
              >
                {tab.label}
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key
                      ? `${tab.color} bg-current/10`
                      : "text-text-muted"
                  }`}
                  style={
                    activeTab === tab.key
                      ? { backgroundColor: `${tab.color === "text-amber-500" ? "#F59E0B" : tab.color === "text-green-500" ? "#22C55E" : "#EF4444"}15` }
                      : {}
                  }
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full sm:w-[260px]"
              placeholder="Search by name, room, TxID..."
            />
          </div>
        </div>
      </div>

      {/* Proofs List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 animate-fade-in">
          <FileText size={48} className="text-text-muted/30 mx-auto mb-3" />
          <p className="text-text-muted dark:text-slate-400">
            No {activeTab.toLowerCase()} payment proofs found
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((proof, idx) => {
            const methodInfo = METHOD_INFO[proof.method] || { label: proof.method, icon: CreditCard, color: "#94A3B8" };
            const MethodIcon = methodInfo.icon;

            return (
              <div
                key={proof.id}
                className="card hover:shadow-lg transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary dark:text-white text-sm">
                        {proof.resident.user.name}
                      </p>
                      {proof.resident.room && (
                        <p className="text-xs text-text-muted dark:text-slate-400 flex items-center gap-1">
                          <DoorOpen size={12} /> Room {proof.resident.room.roomNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  {proof.status === "PENDING" && (
                    <span className="badge-warning text-xs">Pending</span>
                  )}
                  {proof.status === "APPROVED" && (
                    <span className="badge-success text-xs">Approved</span>
                  )}
                  {proof.status === "REJECTED" && (
                    <span className="badge-danger text-xs">Rejected</span>
                  )}
                </div>

                {/* Bill Info */}
                <div className="bg-bg-main dark:bg-[#0B1222] rounded-xl p-3 mb-3 border border-border dark:border-[#1E2D42]">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={14} className="text-text-muted" />
                    <span className="text-xs font-medium text-text-muted dark:text-slate-400">
                      {MONTHS[proof.bill.month - 1]} {proof.bill.year}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-text-muted dark:text-slate-500">Total</p>
                      <p className="font-semibold text-text-primary dark:text-white">
                        {formatCurrency(proof.bill.totalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-muted dark:text-slate-500">Paid</p>
                      <p className="font-semibold text-green-500">
                        {formatCurrency(proof.bill.paidAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-muted dark:text-slate-500">Balance</p>
                      <p className="font-semibold text-red-500">
                        {formatCurrency(proof.bill.balance)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted dark:text-slate-400">Amount</span>
                    <span className="text-sm font-bold text-text-primary dark:text-white">
                      {formatCurrency(proof.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted dark:text-slate-400">Method</span>
                    <span className="text-xs font-medium flex items-center gap-1.5">
                      <MethodIcon size={14} style={{ color: methodInfo.color }} />
                      <span className="text-text-primary dark:text-white">{methodInfo.label}</span>
                    </span>
                  </div>
                  {proof.transactionId && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted dark:text-slate-400">Transaction ID</span>
                      <span className="text-xs font-mono text-text-primary dark:text-white">
                        {proof.transactionId}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted dark:text-slate-400">Submitted</span>
                    <span className="text-xs text-text-primary dark:text-white">
                      {formatDate(proof.submittedAt)}
                    </span>
                  </div>
                  {proof.proofImageUrl && (
                    <a
                      href={proof.proofImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <ExternalLink size={12} /> View Proof Image
                    </a>
                  )}
                </div>

                {/* Rejection Reason */}
                {proof.status === "REJECTED" && proof.rejectionReason && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                    <p className="text-xs text-red-400">
                      <strong>Reason:</strong> {proof.rejectionReason}
                    </p>
                    {proof.reviewedBy && (
                      <p className="text-xs text-red-400/70 mt-1">
                        By: {proof.reviewedBy.name}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions for PENDING */}
                {proof.status === "PENDING" && (
                  <div className="flex gap-2 pt-3 border-t border-border dark:border-[#1E2D42]">
                    <button
                      onClick={() => handleApprove(proof.id)}
                      disabled={actionLoading === proof.id}
                      className="btn-success flex-1 flex items-center justify-center gap-1.5 text-sm"
                    >
                      {actionLoading === proof.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => openRejectModal(proof.id)}
                      disabled={actionLoading === proof.id}
                      className="btn-danger flex-1 flex items-center justify-center gap-1.5 text-sm"
                    >
                      <Ban size={14} />
                      Reject
                    </button>
                  </div>
                )}

                {/* Approved info */}
                {proof.status === "APPROVED" && proof.reviewedBy && (
                  <div className="pt-3 border-t border-border dark:border-[#1E2D42]">
                    <p className="text-xs text-text-muted dark:text-slate-500">
                      Approved by {proof.reviewedBy.name} on {proof.reviewedAt ? formatDate(proof.reviewedAt) : "N/A"}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModal}
        onClose={() => setRejectModal(false)}
        title="Reject Payment Proof"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted dark:text-slate-400">
            Please provide a reason for rejecting this payment proof. The resident will be
            notified with this reason.
          </p>
          <div>
            <label className="label">Rejection Reason *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="input w-full min-h-[100px] resize-none"
              placeholder="e.g., Transaction ID not found, amount mismatch, unclear screenshot..."
              required
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setRejectModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectReason.trim() || actionLoading !== null}
              className="btn-danger flex items-center gap-2"
            >
              {actionLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <XCircle size={14} />
              )}
              Reject Proof
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
