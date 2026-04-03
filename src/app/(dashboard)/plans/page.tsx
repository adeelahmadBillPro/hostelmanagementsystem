"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Modal from "@/components/ui/modal";
import FileUpload from "@/components/ui/file-upload";
import { useToast } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import {
  Crown, Check, Zap, Clock, CheckCircle2, XCircle,
  Send, Loader2, AlertTriangle, CreditCard,
  Building, Smartphone, Banknote, QrCode, Copy, Info,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
  maxHostels: number;
  maxResidents: number;
  maxRooms: number;
  maxStaff: number;
  features: string[];
}

interface UpgradeRequest {
  id: string;
  amount: number;
  method: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  requestedPlan: { name: string; price: number };
}

const METHODS = [
  { value: "BANK", label: "Bank Transfer", icon: Building },
  { value: "JAZZCASH", label: "JazzCash", icon: Smartphone },
  { value: "EASYPAISA", label: "EasyPaisa", icon: CreditCard },
  { value: "CASH", label: "Cash", icon: Banknote },
];

export default function PlansPage() {
  const { addToast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Upgrade modal
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paySettings, setPaySettings] = useState<any>(null);

  const hasPending = requests.some((r) => r.status === "PENDING");

  useEffect(() => {
    fetchData();
    fetch("/api/payment-settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setPaySettings(d); });
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/plan-upgrade");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
        setCurrentPlan(data.currentPlan || null);
        setIsTrial(data.isTrial || false);
        setRequests(data.requests || []);
      }
    } catch {
      addToast("Failed to load plans", "error");
    } finally {
      setLoading(false);
    }
  };

  const openUpgrade = (plan: Plan) => {
    setSelectedPlan(plan);
    setAmount(String(plan.price));
    setMethod("");
    setTransactionId("");
    setProofImageUrl("");
    setNotes("");
    setShowUpgrade(true);
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;
    if (!method) { addToast("Select payment method", "error"); return; }
    if (method !== "CASH" && !transactionId.trim()) { addToast("Transaction ID required", "error"); return; }

    try {
      setSubmitting(true);
      const res = await fetch("/api/plan-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          amount: parseFloat(amount) || selectedPlan.price,
          method,
          transactionId: transactionId.trim() || undefined,
          proofImageUrl: proofImageUrl || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Upgrade request submitted! Admin will review shortly.", "success");
        setShowUpgrade(false);
        fetchData();
      } else {
        addToast(data.error || "Failed to submit", "error");
      }
    } catch {
      addToast("Something went wrong", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="My Plan">
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Plan">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Current Plan Banner */}
        <div className={`rounded-2xl p-6 border-2 ${
          isTrial
            ? "bg-amber-500/5 border-amber-500/30"
            : "bg-primary/5 border-primary/30"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown size={20} className={isTrial ? "text-amber-500" : "text-primary"} />
                <h2 className="text-xl font-bold text-text-primary dark:text-white">
                  {currentPlan?.name || "Free Trial"}
                </h2>
                {isTrial && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">TRIAL</span>
                )}
              </div>
              <p className="text-sm text-text-muted dark:text-slate-400">
                {isTrial
                  ? "You are on the free trial. Upgrade to unlock more features and limits."
                  : `${formatCurrency(currentPlan?.price || 0)}/month`}
              </p>
            </div>
            {hasPending && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Clock size={16} className="text-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Upgrade request pending review
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Plans Grid */}
        <div>
          <h3 className="text-lg font-bold text-text-primary dark:text-white mb-4">Available Plans</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const isCurrentPlan = currentPlan?.id === plan.id;
              const isFreeTrial = plan.price === 0;
              return (
                <div
                  key={plan.id}
                  className={`card relative overflow-hidden transition-all ${
                    isCurrentPlan
                      ? "border-2 border-primary ring-2 ring-primary/20"
                      : "hover:border-primary/40"
                  }`}
                >
                  {isCurrentPlan && (
                    <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                      CURRENT
                    </div>
                  )}
                  <div className="p-5">
                    <h4 className="text-base font-bold text-text-primary dark:text-white">{plan.name}</h4>
                    <div className="mt-2 mb-4">
                      <span className="text-2xl font-bold text-primary">
                        {isFreeTrial ? "Free" : formatCurrency(plan.price)}
                      </span>
                      {!isFreeTrial && <span className="text-xs text-text-muted">/month</span>}
                    </div>
                    <div className="space-y-2 text-xs text-text-secondary dark:text-slate-400 mb-4">
                      <p>{plan.maxHostels === 999 ? "Unlimited" : plan.maxHostels} Hostels</p>
                      <p>{plan.maxResidents === 999 ? "Unlimited" : plan.maxResidents} Residents</p>
                      <p>{plan.maxRooms === 999 ? "Unlimited" : plan.maxRooms} Rooms</p>
                      <p>{plan.maxStaff === 999 ? "Unlimited" : plan.maxStaff} Staff</p>
                    </div>
                    {plan.features.length > 0 && (
                      <div className="space-y-1.5 mb-4">
                        {plan.features.slice(0, 5).map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-text-secondary dark:text-slate-400">
                            <Check size={12} className="text-green-500 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {isCurrentPlan ? (
                      <button disabled className="btn-secondary w-full text-xs opacity-60">
                        Current Plan
                      </button>
                    ) : isFreeTrial ? (
                      <button disabled className="btn-secondary w-full text-xs opacity-40">
                        Trial
                      </button>
                    ) : (
                      <button
                        onClick={() => openUpgrade(plan)}
                        disabled={hasPending}
                        className="btn-primary w-full text-xs flex items-center justify-center gap-1"
                      >
                        <Zap size={14} />
                        {hasPending ? "Request Pending" : "Upgrade"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Request History */}
        {requests.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-text-primary dark:text-white mb-4">Upgrade Requests</h3>
            <div className="space-y-3">
              {requests.map((req) => (
                <div key={req.id} className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary dark:text-white">
                      {req.requestedPlan.name} — {formatCurrency(req.amount)}
                    </p>
                    <p className="text-xs text-text-muted dark:text-slate-400">
                      {new Date(req.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                      {" via "}{req.method}
                    </p>
                  </div>
                  <div>
                    {req.status === "PENDING" && (
                      <span className="badge-warning inline-flex items-center gap-1"><Clock size={12} /> Pending Review</span>
                    )}
                    {req.status === "APPROVED" && (
                      <span className="badge-success inline-flex items-center gap-1"><CheckCircle2 size={12} /> Approved</span>
                    )}
                    {req.status === "REJECTED" && (
                      <div>
                        <span className="badge-danger inline-flex items-center gap-1"><XCircle size={12} /> Rejected</span>
                        {req.rejectionReason && (
                          <p className="text-xs text-red-400 mt-1">{req.rejectionReason}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      <Modal isOpen={showUpgrade} onClose={() => !submitting && setShowUpgrade(false)} title={`Upgrade to ${selectedPlan?.name}`}>
        {selectedPlan && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 text-center">
              <p className="text-sm text-text-muted">Plan Price</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(selectedPlan.price)}<span className="text-sm font-normal">/month</span></p>
            </div>

            <div>
              <label className="label">Amount Paid (PKR) <span className="text-red-500">*</span></label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="input w-full" placeholder="Enter amount" min="1" />
            </div>

            <div>
              <label className="label">Payment Method <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {METHODS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        method === m.value ? "border-primary bg-primary/5" : "border-border dark:border-[#1E2D42] hover:border-primary/40"
                      }`}>
                      <Icon size={16} className={method === m.value ? "text-primary" : "text-text-muted"} />
                      <span className={`text-sm ${method === m.value ? "text-primary font-medium" : "text-text-muted"}`}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment account details */}
            {method && paySettings && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Info size={15} />
                  Send payment to this account
                </div>
                {method === "BANK" && (paySettings.bankAccount || paySettings.bankName) && (
                  <div className="space-y-1.5 text-sm">
                    {paySettings.bankName && <p><span className="text-text-muted">Bank:</span> <strong className="text-text-primary dark:text-white">{paySettings.bankName}</strong></p>}
                    {paySettings.bankTitle && <p><span className="text-text-muted">Title:</span> <strong className="text-text-primary dark:text-white">{paySettings.bankTitle}</strong></p>}
                    {paySettings.bankAccount && (
                      <p className="flex items-center gap-2">
                        <span className="text-text-muted">Account:</span>
                        <strong className="text-text-primary dark:text-white font-mono">{paySettings.bankAccount}</strong>
                        <button onClick={() => { navigator.clipboard.writeText(paySettings.bankAccount); addToast("Copied!", "success"); }} className="p-1 rounded hover:bg-primary/10"><Copy size={13} className="text-primary" /></button>
                      </p>
                    )}
                    {paySettings.bankIban && <p><span className="text-text-muted">IBAN:</span> <span className="font-mono text-xs text-text-primary dark:text-white">{paySettings.bankIban}</span></p>}
                    {paySettings.bankQrImage && <img src={paySettings.bankQrImage} alt="Bank QR" className="w-32 h-32 object-contain rounded-lg border border-border mt-2" />}
                  </div>
                )}
                {method === "JAZZCASH" && (paySettings.jazzcashNumber || paySettings.jazzcashName) && (
                  <div className="space-y-1.5 text-sm">
                    {paySettings.jazzcashName && <p><span className="text-text-muted">Name:</span> <strong className="text-text-primary dark:text-white">{paySettings.jazzcashName}</strong></p>}
                    {paySettings.jazzcashNumber && (
                      <p className="flex items-center gap-2">
                        <span className="text-text-muted">Number:</span>
                        <strong className="text-text-primary dark:text-white font-mono">{paySettings.jazzcashNumber}</strong>
                        <button onClick={() => { navigator.clipboard.writeText(paySettings.jazzcashNumber); addToast("Copied!", "success"); }} className="p-1 rounded hover:bg-primary/10"><Copy size={13} className="text-primary" /></button>
                      </p>
                    )}
                    {paySettings.jazzcashQrImage && <img src={paySettings.jazzcashQrImage} alt="JazzCash QR" className="w-32 h-32 object-contain rounded-lg border border-border mt-2" />}
                  </div>
                )}
                {method === "EASYPAISA" && (paySettings.easypaisaNumber || paySettings.easypaisaName) && (
                  <div className="space-y-1.5 text-sm">
                    {paySettings.easypaisaName && <p><span className="text-text-muted">Name:</span> <strong className="text-text-primary dark:text-white">{paySettings.easypaisaName}</strong></p>}
                    {paySettings.easypaisaNumber && (
                      <p className="flex items-center gap-2">
                        <span className="text-text-muted">Number:</span>
                        <strong className="text-text-primary dark:text-white font-mono">{paySettings.easypaisaNumber}</strong>
                        <button onClick={() => { navigator.clipboard.writeText(paySettings.easypaisaNumber); addToast("Copied!", "success"); }} className="p-1 rounded hover:bg-primary/10"><Copy size={13} className="text-primary" /></button>
                      </p>
                    )}
                    {paySettings.easypaisaQrImage && <img src={paySettings.easypaisaQrImage} alt="EasyPaisa QR" className="w-32 h-32 object-contain rounded-lg border border-border mt-2" />}
                  </div>
                )}
                {method === "CASH" && paySettings.cashInstructions && (
                  <p className="text-sm text-text-secondary dark:text-slate-400">{paySettings.cashInstructions}</p>
                )}
                {!paySettings.bankAccount && !paySettings.jazzcashNumber && !paySettings.easypaisaNumber && !paySettings.cashInstructions && (
                  <p className="text-xs text-text-muted italic">Payment details not configured yet. Contact admin for account information.</p>
                )}
              </div>
            )}

            {method && method !== "CASH" && (
              <div>
                <label className="label">Transaction ID <span className="text-red-500">*</span></label>
                <input type="text" value={transactionId} onChange={(e) => setTransactionId(e.target.value)}
                  className="input w-full" placeholder="e.g. TXN123456" />
              </div>
            )}

            <div>
              <label className="label">Payment Screenshot {method !== "CASH" && <span className="text-red-500">*</span>}</label>
              <FileUpload onUpload={(url) => setProofImageUrl(url)} accept="image/*,.pdf"
                label="Upload payment proof" currentUrl={proofImageUrl} />
            </div>

            <div>
              <label className="label">Notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                className="input w-full min-h-[60px] resize-none" placeholder="Any message for admin..." maxLength={300} />
            </div>

            <button onClick={handleSubmit} disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {submitting ? "Submitting..." : "Submit Upgrade Request"}
            </button>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
