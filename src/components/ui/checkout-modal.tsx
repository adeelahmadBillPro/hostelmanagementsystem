"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";
import {
  Loader2, AlertTriangle, CheckCircle2, Calendar,
  DoorOpen, Receipt, Minus, Plus, FileText,
} from "lucide-react";

interface SettlementPreview {
  resident: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    roomNumber: string;
    bedNumber: string;
    billingType: string;
  };
  stay: {
    checkInDate: string;
    checkoutDate: string;
    daysStayed: number;
    nightsStayed: number;
  };
  charges: {
    unpaidBills: { month: string; amount: number; billId: string }[];
    unpaidBillsTotal: number;
    proRatedRent: number;
    proRatedFood: number;
    unbilledOrders: number;
    unbilledMeter: number;
    unbilledParking: number;
    totalCharges: number;
  };
  credits: {
    securityDeposit: number;
    advanceBalance: number;
    overpayments: number;
    totalCredits: number;
  };
  netAmount: number;
  settlementType: "DUES" | "REFUND" | "SETTLED";
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostelId: string;
  residentId: string;
  residentName: string;
  onCheckoutComplete: () => void;
}

interface Deduction {
  label: string;
  amount: number;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  hostelId,
  residentId,
  residentName,
  onCheckoutComplete,
}: CheckoutModalProps) {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Manager-entered charges
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen && residentId) {
      fetchPreview();
      setCompleted(false);
      setDeductions([]);
      setNotes("");
    }
  }, [isOpen, residentId]);

  const fetchPreview = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/hostels/${hostelId}/settlements?residentId=${residentId}`);
      const data = await res.json();
      if (res.ok) {
        setPreview(data);
      } else {
        setError(data.error || "Failed to calculate settlement");
      }
    } catch {
      setError("Failed to load settlement data");
    } finally {
      setLoading(false);
    }
  };

  const addDeduction = () => {
    setDeductions((prev) => [...prev, { label: "", amount: 0 }]);
  };

  const removeDeduction = (index: number) => {
    setDeductions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDeduction = (index: number, field: "label" | "amount", value: string | number) => {
    setDeductions((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );
  };

  const totalDeductions = deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const finalCharges = (preview?.charges.totalCharges || 0) + totalDeductions;
  const finalCredits = preview?.credits.totalCredits || 0;
  const finalNet = Math.round(finalCharges - finalCredits);

  const handleComplete = async () => {
    if (!preview) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/hostels/${hostelId}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          residentId,
          damageCharges: totalDeductions,
          deductions: deductions.length > 0 ? deductions.filter((d) => d.amount > 0) : undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCompleted(true);
      } else {
        setError(data.error || "Failed to complete checkout");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setCompleting(false);
    }
  };

  const billingLabel: Record<string, string> = {
    MONTHLY: "Monthly",
    WEEKLY: "Weekly",
    DAILY: "Daily",
    PER_NIGHT: "Per Night",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!completing) { onClose(); if (completed) onCheckoutComplete(); } }}
      title={completed ? "Checkout Complete" : "Checkout Settlement"}
      maxWidth="max-w-[600px]"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-primary" />
          <span className="ml-3 text-text-muted">Calculating settlement...</span>
        </div>
      ) : error && !preview ? (
        <div className="text-center py-8">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-3" />
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : completed ? (
        <div className="text-center py-8 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-text-primary dark:text-white mb-2">
            Checkout Complete!
          </h3>
          <p className="text-text-muted dark:text-slate-400 text-sm mb-1">
            {residentName} has been checked out successfully.
          </p>
          <p className="text-sm font-semibold mb-6">
            {finalNet > 0 ? (
              <span className="text-red-500">Amount Due: {formatCurrency(finalNet)}</span>
            ) : finalNet < 0 ? (
              <span className="text-green-500">Refund: {formatCurrency(Math.abs(finalNet))}</span>
            ) : (
              <span className="text-emerald-500">Fully Settled</span>
            )}
          </p>
          <button
            onClick={() => { onClose(); onCheckoutComplete(); }}
            className="btn-primary"
          >
            Done
          </button>
        </div>
      ) : preview ? (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Resident Info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-main dark:bg-[#0B1222] border border-border dark:border-[#1E2D42]">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <DoorOpen size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary dark:text-white truncate">{preview.resident.name}</p>
              <p className="text-xs text-text-muted dark:text-slate-400">
                Room {preview.resident.roomNumber} / Bed {preview.resident.bedNumber}
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary shrink-0">
              {billingLabel[preview.resident.billingType] || preview.resident.billingType}
            </span>
          </div>

          {/* Stay Duration */}
          <div className="flex items-center gap-2 text-xs text-text-muted dark:text-slate-400">
            <Calendar size={14} />
            <span>
              {new Date(preview.stay.checkInDate).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
              {" → "}
              {new Date(preview.stay.checkoutDate).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
              {" "}
              <span className="font-semibold text-text-primary dark:text-white">
                ({preview.stay.daysStayed} {preview.stay.daysStayed === 1 ? "day" : "days"})
              </span>
            </span>
          </div>

          {/* Charges */}
          <div className="rounded-xl border border-border dark:border-[#1E2D42] overflow-hidden">
            <div className="bg-red-500/5 dark:bg-red-500/10 px-4 py-2 border-b border-border dark:border-[#1E2D42]">
              <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Charges</p>
            </div>
            <div className="p-4 space-y-2 text-sm">
              {preview.charges.unpaidBills.map((bill) => (
                <div key={bill.billId} className="flex justify-between">
                  <span className="text-text-muted dark:text-slate-400">Unpaid: {bill.month}</span>
                  <span className="font-medium text-text-primary dark:text-white">{formatCurrency(bill.amount)}</span>
                </div>
              ))}
              {preview.charges.proRatedRent > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-muted dark:text-slate-400">
                    {preview.resident.billingType === "PER_NIGHT"
                      ? `Room (${preview.stay.nightsStayed} nights)`
                      : preview.resident.billingType === "DAILY"
                      ? `Room (${preview.stay.daysStayed} days)`
                      : "Room Rent (pro-rated)"}
                  </span>
                  <span className="font-medium text-text-primary dark:text-white">{formatCurrency(preview.charges.proRatedRent)}</span>
                </div>
              )}
              {preview.charges.proRatedFood > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-muted dark:text-slate-400">Food Fee (pro-rated)</span>
                  <span className="font-medium text-text-primary dark:text-white">{formatCurrency(preview.charges.proRatedFood)}</span>
                </div>
              )}
              {preview.charges.unbilledOrders > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-muted dark:text-slate-400">Food Orders (unbilled)</span>
                  <span className="font-medium text-text-primary dark:text-white">{formatCurrency(preview.charges.unbilledOrders)}</span>
                </div>
              )}
              {preview.charges.unbilledMeter > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-muted dark:text-slate-400">Meter/Utilities</span>
                  <span className="font-medium text-text-primary dark:text-white">{formatCurrency(preview.charges.unbilledMeter)}</span>
                </div>
              )}
              {preview.charges.unbilledParking > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-muted dark:text-slate-400">Parking</span>
                  <span className="font-medium text-text-primary dark:text-white">{formatCurrency(preview.charges.unbilledParking)}</span>
                </div>
              )}

              {/* Deductions (manager-entered) */}
              {deductions.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={d.label}
                    onChange={(e) => updateDeduction(i, "label", e.target.value)}
                    className="input !h-8 text-xs flex-1"
                    placeholder="e.g. Room damage"
                  />
                  <input
                    type="number"
                    value={d.amount || ""}
                    onChange={(e) => updateDeduction(i, "amount", parseFloat(e.target.value) || 0)}
                    className="input !h-8 text-xs w-24 text-right"
                    placeholder="0"
                    min="0"
                  />
                  <button onClick={() => removeDeduction(i)} className="text-red-400 hover:text-red-600">
                    <Minus size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={addDeduction}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 mt-1"
              >
                <Plus size={12} /> Add Deduction (damage, cleaning, etc.)
              </button>

              <div className="flex justify-between pt-2 border-t border-border dark:border-[#1E2D42] font-bold">
                <span className="text-red-600 dark:text-red-400">Total Charges</span>
                <span className="text-red-600 dark:text-red-400">{formatCurrency(finalCharges)}</span>
              </div>
            </div>
          </div>

          {/* Credits */}
          <div className="rounded-xl border border-border dark:border-[#1E2D42] overflow-hidden">
            <div className="bg-green-500/5 dark:bg-green-500/10 px-4 py-2 border-b border-border dark:border-[#1E2D42]">
              <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Credits</p>
            </div>
            <div className="p-4 space-y-2 text-sm">
              {preview.credits.securityDeposit > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-muted dark:text-slate-400">Security Deposit</span>
                  <span className="font-medium text-green-600 dark:text-green-400">-{formatCurrency(preview.credits.securityDeposit)}</span>
                </div>
              )}
              {preview.credits.advanceBalance > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-muted dark:text-slate-400">Advance Balance</span>
                  <span className="font-medium text-green-600 dark:text-green-400">-{formatCurrency(preview.credits.advanceBalance)}</span>
                </div>
              )}
              {preview.credits.overpayments > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-muted dark:text-slate-400">Overpayments</span>
                  <span className="font-medium text-green-600 dark:text-green-400">-{formatCurrency(preview.credits.overpayments)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-border dark:border-[#1E2D42] font-bold">
                <span className="text-green-600 dark:text-green-400">Total Credits</span>
                <span className="text-green-600 dark:text-green-400">-{formatCurrency(finalCredits)}</span>
              </div>
            </div>
          </div>

          {/* Net Settlement */}
          <div className={`p-4 rounded-xl border-2 text-center ${
            finalNet > 0
              ? "border-red-500/30 bg-red-500/5"
              : finalNet < 0
              ? "border-green-500/30 bg-green-500/5"
              : "border-emerald-500/30 bg-emerald-500/5"
          }`}>
            <p className="text-xs text-text-muted dark:text-slate-400 mb-1">Net Settlement</p>
            {finalNet > 0 ? (
              <>
                <p className="text-2xl font-bold text-red-500">{formatCurrency(finalNet)}</p>
                <p className="text-xs text-red-400 mt-1">Resident owes this amount</p>
              </>
            ) : finalNet < 0 ? (
              <>
                <p className="text-2xl font-bold text-green-500">{formatCurrency(Math.abs(finalNet))}</p>
                <p className="text-xs text-green-400 mt-1">Refund to resident</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-emerald-500">Settled</p>
                <p className="text-xs text-emerald-400 mt-1">No amount due</p>
              </>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full min-h-[60px] resize-none text-sm"
              placeholder="Any notes about this checkout..."
              maxLength={500}
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1" disabled={completing}>
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={completing}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {completing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Receipt size={16} />
              )}
              {completing ? "Processing..." : "Complete Checkout"}
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
