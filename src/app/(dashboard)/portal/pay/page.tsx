"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useToast } from "@/components/providers";
import { formatCurrency, formatDate } from "@/lib/utils";
import FileUpload from "@/components/ui/file-upload";
import {
  Wallet,
  Banknote,
  Building,
  Smartphone,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  FileText,
  Loader2,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";

interface Bill {
  id: string;
  month: number;
  year: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
}

interface PaymentProof {
  id: string;
  amount: number;
  method: string;
  transactionId: string | null;
  proofImageUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  submittedAt: string;
  bill: Bill;
}

interface FormErrors {
  billId?: string;
  amount?: string;
  method?: string;
  transactionId?: string;
  proofImageUrl?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const METHODS = [
  { value: "CASH", label: "Cash", icon: Banknote, color: "#22C55E" },
  { value: "BANK", label: "Bank Transfer", icon: Building, color: "#3B82F6" },
  { value: "JAZZCASH", label: "JazzCash", icon: Smartphone, color: "#EF4444" },
  { value: "EASYPAISA", label: "EasyPaisa", icon: CreditCard, color: "#10B981" },
];

export default function PayBillPage() {
  const { addToast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [selectedBillId, setSelectedBillId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [note, setNote] = useState("");

  const selectedBill = bills.find((b) => b.id === selectedBillId);

  const pendingForSelected = selectedBillId
    ? proofs.find(
        (p) => p.bill.id === selectedBillId && p.status === "PENDING"
      )
    : undefined;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [billsRes, proofsRes] = await Promise.all([
        fetch("/api/portal/bills"),
        fetch("/api/portal/payment-proof"),
      ]);

      if (billsRes.ok) {
        const allBillsData = await billsRes.json();
        const billsArray = allBillsData.bills || allBillsData || [];
        const unpaidBills = Array.isArray(billsArray)
          ? billsArray.filter((b: Bill) => b.status !== "PAID" && b.balance > 0)
          : [];
        setBills(unpaidBills);
      }

      if (proofsRes.ok) {
        const data = await proofsRes.json();
        setProofs(Array.isArray(data) ? data : []);
      }
    } catch {
      addToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!selectedBillId) {
      newErrors.billId = "Please select a bill";
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    } else if (selectedBill && parsedAmount > selectedBill.balance) {
      newErrors.amount = `Amount cannot exceed balance of ${formatCurrency(selectedBill.balance)}`;
    }

    if (!method) {
      newErrors.method = "Please select a payment method";
    }

    if (method && method !== "CASH") {
      if (!transactionId.trim()) {
        newErrors.transactionId = "Transaction ID is required for non-cash payments";
      }
      if (!proofImageUrl) {
        newErrors.proofImageUrl = "Payment proof is required for non-cash payments";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBillSelect = (billId: string) => {
    setSelectedBillId(billId);
    const bill = bills.find((b) => b.id === billId);
    if (bill) {
      setAmount(bill.balance.toString());
    }
    setErrors({});
    setSubmitted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    if (pendingForSelected) {
      addToast("You already have a pending proof for this bill. Please wait for it to be reviewed.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/portal/payment-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: selectedBillId,
          amount: parseFloat(amount),
          method,
          transactionId: transactionId || undefined,
          proofImageUrl: proofImageUrl || undefined,
          note: note || undefined,
        }),
      });

      if (res.ok) {
        const newProof = await res.json();
        setProofs((prev) => [newProof, ...prev]);
        setSubmitted(true);
        addToast("Payment proof submitted successfully!", "success");
        // Reset form
        setTransactionId("");
        setProofImageUrl("");
        setNote("");
        setErrors({});
      } else {
        const err = await res.json();
        addToast(err.error || "Failed to submit payment proof", "error");
      }
    } catch {
      addToast("Something went wrong", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="badge-warning inline-flex items-center gap-1">
            <Clock size={12} /> Pending
          </span>
        );
      case "APPROVED":
        return (
          <span className="badge-success inline-flex items-center gap-1">
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="badge-danger inline-flex items-center gap-1">
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const getMethodLabel = (m: string) => {
    return METHODS.find((met) => met.value === m)?.label || m;
  };

  if (loading) {
    return (
      <DashboardLayout title="Pay Bill">
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Pay Bill">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Form */}
        <div className="lg:col-span-2">
          {submitted ? (
            <div className="card text-center py-12 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-2">
                Payment Proof Submitted!
              </h2>
              <p className="text-text-muted dark:text-slate-400 mb-6">
                Your payment proof has been submitted and is waiting for manager approval.
                You will be notified once it is reviewed.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setSelectedBillId("");
                  setAmount("");
                  setMethod("");
                  setErrors({});
                }}
                className="btn-primary"
              >
                Submit Another Payment
              </button>
            </div>
          ) : (
            <div className="card animate-fade-in">
              <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-6 flex items-center gap-2">
                <Wallet size={20} className="text-primary" />
                Submit Payment Proof
              </h2>

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* Select Bill */}
                <div>
                  <label className="label">Select Bill *</label>
                  <select
                    value={selectedBillId}
                    onChange={(e) => handleBillSelect(e.target.value)}
                    className="select w-full"
                  >
                    <option value="">Choose an unpaid bill...</option>
                    {bills.map((bill) => (
                      <option key={bill.id} value={bill.id}>
                        {MONTHS[bill.month - 1]} {bill.year} - Balance: {formatCurrency(bill.balance)}
                      </option>
                    ))}
                  </select>
                  {errors.billId && (
                    <p className="text-xs text-red-500 mt-1">{errors.billId}</p>
                  )}
                </div>

                {/* Bill Summary */}
                {selectedBill && (
                  <div className="bg-bg-main dark:bg-[#0B1222] rounded-xl p-4 border border-border dark:border-[#1E2D42] animate-fade-in">
                    <h3 className="text-sm font-semibold text-text-muted dark:text-slate-400 mb-3">
                      Bill Summary
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-text-muted dark:text-slate-500">Total</p>
                        <p className="text-lg font-bold text-text-primary dark:text-white">
                          {formatCurrency(selectedBill.totalAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted dark:text-slate-500">Paid</p>
                        <p className="text-lg font-bold text-green-500">
                          {formatCurrency(selectedBill.paidAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted dark:text-slate-500">Balance</p>
                        <p className="text-lg font-bold text-red-500">
                          {formatCurrency(selectedBill.balance)}
                        </p>
                      </div>
                    </div>

                    {pendingForSelected && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                        <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-500">
                          You submitted a payment proof on {formatDate(pendingForSelected.submittedAt)} that is still pending review. Please wait for it to be approved or rejected before submitting another.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="label">Amount (PKR) *</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setErrors((prev) => ({ ...prev, amount: undefined }));
                    }}
                    className="input w-full"
                    placeholder="Enter amount"
                    min="1"
                    max={selectedBill?.balance}
                  />
                  {errors.amount && (
                    <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
                  )}
                  {selectedBill && parseFloat(amount) < selectedBill.balance && parseFloat(amount) > 0 && (
                    <p className="text-xs text-amber-500 mt-1">
                      Partial payment: {formatCurrency(selectedBill.balance - parseFloat(amount))} will remain
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="label">Payment Method *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {METHODS.map((m) => {
                      const Icon = m.icon;
                      const isSelected = method === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => {
                            setMethod(m.value);
                            setErrors((prev) => ({ ...prev, method: undefined }));
                            if (m.value === "CASH") {
                              setErrors((prev) => ({
                                ...prev,
                                transactionId: undefined,
                                proofImageUrl: undefined,
                              }));
                            }
                          }}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                            isSelected
                              ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-lg shadow-primary/10"
                              : "border-border dark:border-[#1E2D42] hover:border-primary/50 bg-white dark:bg-[#111C2E]"
                          }`}
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${m.color}15` }}
                          >
                            <Icon size={20} style={{ color: m.color }} />
                          </div>
                          <span
                            className={`text-xs font-medium ${
                              isSelected
                                ? "text-primary"
                                : "text-text-muted dark:text-slate-400"
                            }`}
                          >
                            {m.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.method && (
                    <p className="text-xs text-red-500 mt-1">{errors.method}</p>
                  )}
                </div>

                {/* Transaction ID (for non-cash) */}
                {method && method !== "CASH" && (
                  <div className="animate-fade-in">
                    <label className="label">Transaction ID *</label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => {
                        setTransactionId(e.target.value);
                        setErrors((prev) => ({ ...prev, transactionId: undefined }));
                      }}
                      className="input w-full"
                      placeholder="Enter transaction/reference ID"
                    />
                    {errors.transactionId && (
                      <p className="text-xs text-red-500 mt-1">{errors.transactionId}</p>
                    )}
                  </div>
                )}

                {/* Payment Proof Upload */}
                <div>
                  <label className="label">
                    Payment Proof (Screenshot/Photo){" "}
                    {method && method !== "CASH" ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="text-text-muted dark:text-slate-500 text-xs font-normal">(optional for cash)</span>
                    )}
                  </label>
                  <FileUpload
                    onUpload={(url) => {
                      setProofImageUrl(url);
                      setErrors((prev) => ({ ...prev, proofImageUrl: undefined }));
                    }}
                    accept="image/*,.pdf"
                    label="Upload payment screenshot or receipt"
                    currentUrl={proofImageUrl}
                  />
                  {errors.proofImageUrl && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <ImageIcon size={12} />
                      {errors.proofImageUrl}
                    </p>
                  )}
                </div>

                {/* Note */}
                <div>
                  <label className="label">Note (optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="input w-full min-h-[80px] resize-none"
                    placeholder="Any additional notes..."
                    maxLength={300}
                  />
                  {note.length > 0 && (
                    <p className="text-xs text-text-muted dark:text-slate-400 mt-1 text-right">
                      {note.length}/300
                    </p>
                  )}
                </div>

                {/* Submit */}
                <div>
                  <button
                    type="submit"
                    disabled={submitting || !!pendingForSelected}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    {submitting ? "Submitting..." : "Submit Payment Proof"}
                  </button>
                  {pendingForSelected && (
                    <p className="text-xs text-amber-500 mt-2 text-center flex items-center justify-center gap-1">
                      <AlertTriangle size={12} />
                      Cannot submit while a previous proof is pending review
                    </p>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Previous Submissions */}
        <div className="lg:col-span-1">
          <div className="card animate-fade-in" style={{ animationDelay: "100ms" }}>
            <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-4 flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              My Submissions
            </h2>

            {proofs.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={40} className="text-text-muted/30 mx-auto mb-2" />
                <p className="text-text-muted dark:text-slate-400 text-sm">
                  No payment proofs submitted yet
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {proofs.map((proof, idx) => (
                  <div
                    key={proof.id}
                    className="p-3 rounded-xl border border-border dark:border-[#1E2D42] bg-bg-main dark:bg-[#0B1222] animate-fade-in-up"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <span className="text-sm font-semibold text-text-primary dark:text-white">
                        {formatCurrency(proof.amount)}
                      </span>
                      {getStatusBadge(proof.status)}
                    </div>
                    <div className="space-y-1 text-xs text-text-muted dark:text-slate-400">
                      <p>
                        {MONTHS[proof.bill.month - 1]} {proof.bill.year}
                      </p>
                      <p>Method: {getMethodLabel(proof.method)}</p>
                      {proof.transactionId && (
                        <p>TxID: {proof.transactionId}</p>
                      )}
                      <p>{formatDate(proof.submittedAt)}</p>
                      {proof.proofImageUrl && (
                        <a
                          href={proof.proofImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ImageIcon size={12} />
                          View Receipt
                        </a>
                      )}
                    </div>
                    {proof.status === "REJECTED" && proof.rejectionReason && (
                      <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-xs font-medium text-red-400 mb-0.5">
                          Rejection reason:
                        </p>
                        <p className="text-xs text-red-400">
                          {proof.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
