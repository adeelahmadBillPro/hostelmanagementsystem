"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Modal from "@/components/ui/modal";
import DataTable from "@/components/ui/data-table";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  MessageCircle,
  CreditCard,
  Receipt,
  Loader2,
  Banknote,
  Landmark,
  Smartphone,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/components/providers";

interface BillDetail {
  id: string;
  month: number;
  year: number;
  roomRent: number;
  foodCharges: number;
  otherCharges: number;
  meterCharges: number;
  parkingFee: number;
  previousBalance: number;
  advanceDeduction: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  resident: {
    id: string;
    user: { id: string; name: string; email: string; phone: string | null };
    room: {
      roomNumber: string;
      type: string;
      floor: {
        name: string;
        building: { name: string };
      };
    };
    bed: { bedNumber: string };
  };
  payments: PaymentData[];
}

interface PaymentData {
  id: string;
  amount: number;
  method: string;
  date: string;
  receiptNumber: string | null;
  notes: string | null;
  recordedBy: { name: string };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const METHOD_OPTIONS = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "BANK", label: "Bank Transfer", icon: Landmark },
  { value: "JAZZCASH", label: "JazzCash", icon: Smartphone },
  { value: "EASYPAISA", label: "EasyPaisa", icon: Smartphone },
];

export default function ResidentBillDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hostelId = params.id as string;
  const residentId = params.residentId as string;
  const { addToast } = useToast();

  const now = new Date();
  const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));
  const year = parseInt(searchParams.get("year") || String(now.getFullYear()));
  const shouldOpenPay = searchParams.get("pay") === "true";

  const [bill, setBill] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(shouldOpenPay);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "CASH",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchBill = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/hostels/${hostelId}/billing/${residentId}?month=${month}&year=${year}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBill(data);
    } catch (error) {
      console.error("Error fetching bill:", error);
    } finally {
      setLoading(false);
    }
  }, [hostelId, residentId, month, year]);

  useEffect(() => {
    fetchBill();
  }, [fetchBill]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bill) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/hostels/${hostelId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: bill.id,
          residentId: bill.resident.id,
          amount: parseFloat(paymentForm.amount),
          method: paymentForm.method,
          date: paymentForm.date,
          notes: paymentForm.notes || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        addToast(err.error || "Failed to record payment", "error");
        return;
      }

      setPaymentModal(false);
      setPaymentForm({ amount: "", method: "CASH", date: new Date().toISOString().split("T")[0], notes: "" });
      fetchBill();
    } catch (error) {
      console.error("Payment error:", error);
      addToast("Failed to record payment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!bill) return;
    try {
      setDownloading(true);
      const res = await fetch(
        `/api/hostels/${hostelId}/billing/receipt?billId=${bill.id}`
      );
      if (!res.ok) throw new Error("Failed to download");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${MONTHS[month - 1]}-${year}-${bill.resident.user.name.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      addToast("Failed to download receipt", "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!bill) return;
    const text = encodeURIComponent(
      `*HostelHub - Bill Summary*\n\n` +
      `Resident: ${bill.resident.user.name}\n` +
      `Room: ${bill.resident.room.roomNumber}\n` +
      `Period: ${MONTHS[month - 1]} ${year}\n\n` +
      `Room Rent: ${formatCurrency(bill.roomRent)}\n` +
      `Food Charges: ${formatCurrency(bill.foodCharges)}\n` +
      `Parking Fee: ${formatCurrency(bill.parkingFee)}\n` +
      `Meter Charges: ${formatCurrency(bill.meterCharges)}\n` +
      `Other Charges: ${formatCurrency(bill.otherCharges)}\n` +
      `Previous Balance: ${formatCurrency(bill.previousBalance)}\n` +
      `Advance Deduction: -${formatCurrency(bill.advanceDeduction)}\n\n` +
      `*Total: ${formatCurrency(bill.totalAmount)}*\n` +
      `Paid: ${formatCurrency(bill.paidAmount)}\n` +
      `*Balance: ${formatCurrency(bill.balance)}*\n\n` +
      `Status: ${bill.status}`
    );
    const phone = bill.resident.user.phone?.replace(/\D/g, "") || "";
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <span className="badge-success">Paid</span>;
      case "PARTIAL":
        return <span className="badge-warning">Partial</span>;
      case "UNPAID":
        return <span className="badge-danger">Unpaid</span>;
      case "OVERDUE":
        return <span className="badge-danger">Overdue</span>;
      default:
        return <span className="badge-primary">{status}</span>;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "CASH":
        return <Banknote size={14} />;
      case "BANK":
        return <Landmark size={14} />;
      case "JAZZCASH":
      case "EASYPAISA":
        return <Smartphone size={14} />;
      default:
        return <CreditCard size={14} />;
    }
  };

  const paymentColumns = [
    {
      key: "date",
      label: "Date",
      render: (row: PaymentData) => formatDate(row.date),
    },
    {
      key: "amount",
      label: "Amount",
      render: (row: PaymentData) => (
        <span className="font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: "method",
      label: "Method",
      render: (row: PaymentData) => (
        <div className="flex items-center gap-1.5">
          {getMethodIcon(row.method)}
          <span>{row.method}</span>
        </div>
      ),
    },
    {
      key: "receiptNumber",
      label: "Receipt #",
      render: (row: PaymentData) => (
        <span className="font-mono text-xs">{row.receiptNumber || "N/A"}</span>
      ),
    },
    {
      key: "recordedBy",
      label: "Recorded By",
      render: (row: PaymentData) => row.recordedBy.name,
    },
    {
      key: "notes",
      label: "Notes",
      render: (row: PaymentData) => (
        <span className="text-text-muted text-xs">{row.notes || "-"}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Bill Detail" hostelId={hostelId}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!bill) {
    return (
      <DashboardLayout title="Bill Detail" hostelId={hostelId}>
        <div className="card p-8 text-center">
          <p className="text-text-muted mb-4">No bill found for this period.</p>
          <button
            onClick={() => router.back()}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Bill Detail" hostelId={hostelId}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/hostel/${hostelId}/billing?month=${month}&year=${year}`)}
            className="p-2 rounded-lg hover:bg-bg-main transition-colors"
          >
            <ArrowLeft size={20} className="text-text-muted" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-text-primary dark:text-white">
              {bill.resident.user.name}
            </h2>
            <p className="text-sm text-text-muted">
              Room {bill.resident.room.roomNumber} - Bed {bill.resident.bed.bedNumber} |{" "}
              {MONTHS[month - 1]} {year}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleWhatsAppShare}
            className="btn-success flex items-center gap-2"
          >
            <MessageCircle size={16} />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          <button
            onClick={handleDownloadReceipt}
            disabled={downloading}
            className="btn-secondary flex items-center gap-2"
          >
            {downloading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            <span className="hidden sm:inline">PDF</span> Receipt
          </button>
          {bill.balance > 0 && (
            <button
              onClick={() => {
                setPaymentForm((f) => ({ ...f, amount: String(bill.balance) }));
                setPaymentModal(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <CreditCard size={16} />
              <span className="hidden sm:inline">Record</span> Payment
            </button>
          )}
          {bill.paidAmount === 0 && (
            <button
              onClick={async () => {
                if (!confirm("Delete this bill? This cannot be undone.")) return;
                try {
                  const res = await fetch(`/api/hostels/${hostelId}/billing/${bill.id}`, { method: "DELETE" });
                  if (res.ok) {
                    addToast("Bill deleted successfully", "success");
                    router.push(`/hostel/${hostelId}/billing`);
                  } else {
                    const data = await res.json();
                    addToast(data.error || "Failed to delete bill", "error");
                  }
                } catch { addToast("Failed to delete bill", "error"); }
              }}
              className="btn-danger flex items-center gap-2"
            >
              Delete Bill
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bill Breakdown */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Bill Breakdown</h3>
              {getStatusBadge(bill.status)}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary dark:text-gray-400">Room Rent</span>
                <span className="font-medium text-text-primary dark:text-white">
                  {formatCurrency(bill.roomRent)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary dark:text-gray-400">Food Charges</span>
                <span className="font-medium text-text-primary dark:text-white">
                  {formatCurrency(bill.foodCharges)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary dark:text-gray-400">Parking Fee</span>
                <span className="font-medium text-text-primary dark:text-white">
                  {formatCurrency(bill.parkingFee)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary dark:text-gray-400">Meter Charges</span>
                <span className="font-medium text-text-primary dark:text-white">
                  {formatCurrency(bill.meterCharges)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary dark:text-gray-400">Other Charges</span>
                <span className="font-medium text-text-primary dark:text-white">
                  {formatCurrency(bill.otherCharges)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary dark:text-gray-400">Previous Balance</span>
                <span className="font-medium text-text-primary dark:text-white">
                  {formatCurrency(bill.previousBalance)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary dark:text-gray-400">Advance Deduction</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  - {formatCurrency(bill.advanceDeduction)}
                </span>
              </div>

              <div className="border-t border-border dark:border-[#1E2D42] pt-3 mt-3 space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-text-primary dark:text-white">Total Amount</span>
                  <span className="text-text-primary dark:text-white">
                    {formatCurrency(bill.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-green-600 dark:text-green-400">Paid Amount</span>
                  <span className="text-green-600 dark:text-green-400">
                    {formatCurrency(bill.paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span className={bill.balance > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                    {bill.balance > 0 ? "Remaining Balance" : "Fully Paid"}
                  </span>
                  <span className={bill.balance > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                    {formatCurrency(bill.balance)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resident Info */}
        <div>
          <div className="card">
            <h3 className="section-title mb-4">Resident Info</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-text-muted uppercase font-medium">Name</p>
                <p className="text-sm font-medium text-text-primary dark:text-white">
                  {bill.resident.user.name}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase font-medium">Email</p>
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  {bill.resident.user.email}
                </p>
              </div>
              {bill.resident.user.phone && (
                <div>
                  <p className="text-xs text-text-muted uppercase font-medium">Phone</p>
                  <p className="text-sm text-text-secondary dark:text-gray-400">
                    {bill.resident.user.phone}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-text-muted uppercase font-medium">Room</p>
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  {bill.resident.room.floor.building.name} &gt;{" "}
                  {bill.resident.room.floor.name} &gt; Room{" "}
                  {bill.resident.room.roomNumber}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase font-medium">Bed</p>
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  {bill.resident.bed.bedNumber}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="mt-6">
        <h3 className="section-title mb-4">Payment History</h3>
        <DataTable
          columns={paymentColumns}
          data={bill.payments}
          searchable={false}
          emptyMessage="No payments recorded yet."
        />
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={paymentModal}
        onClose={() => setPaymentModal(false)}
        title="Record Payment"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="label">Amount (PKR)</label>
            <input
              type="number"
              value={paymentForm.amount}
              onChange={(e) =>
                setPaymentForm((f) => ({ ...f, amount: e.target.value }))
              }
              className="input"
              placeholder="Enter amount"
              min="1"
              max={bill.balance}
              step="0.01"
              required
            />
            <p className="text-xs text-text-muted mt-1">
              Remaining balance: {formatCurrency(bill.balance)}
            </p>
          </div>

          <div>
            <label className="label">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {METHOD_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setPaymentForm((f) => ({ ...f, method: opt.value }))
                    }
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors text-sm ${
                      paymentForm.method === opt.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border dark:border-[#1E2D42] text-text-secondary hover:border-primary/40"
                    }`}
                  >
                    <Icon size={16} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label">Payment Date</label>
            <input
              type="date"
              value={paymentForm.date}
              onChange={(e) =>
                setPaymentForm((f) => ({ ...f, date: e.target.value }))
              }
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Notes (Optional)</label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) =>
                setPaymentForm((f) => ({ ...f, notes: e.target.value }))
              }
              className="textarea"
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPaymentModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Recording...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  Record Payment
                </span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
