"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  Edit2,
  Info,
} from "lucide-react";
import { useToast } from "@/components/providers";

interface BillDetail {
  id: string;
  month: number;
  year: number;
  billingCycle?: string;
  periodStart?: string;
  periodEnd?: string;
  roomRent: number;
  foodCharges: number;
  fixedFoodFee: number;
  otherCharges: number;
  meterCharges: number;
  parkingFee: number;
  previousBalance: number;
  advanceDeduction: number;
  discount?: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  dueDate?: string;
  notes?: string;
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
  const { data: session } = useSession();
  const canEdit = ["TENANT_ADMIN", "HOSTEL_MANAGER", "SUPER_ADMIN"].includes(session?.user?.role || "");

  const now = new Date();
  const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));
  const year = parseInt(searchParams.get("year") || String(now.getFullYear()));
  const shouldOpenPay = searchParams.get("pay") === "true";

  const [bill, setBill] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(shouldOpenPay);

  // Edit bill state
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    roomRent: "", foodCharges: "", otherCharges: "",
    meterCharges: "", parkingFee: "", discount: "",
    discountReason: "", notes: "", dueDate: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [hostelPayment, setHostelPayment] = useState<{
    jazzCashNumber?: string; jazzCashTitle?: string;
    easyPaisaNumber?: string; easyPaisaTitle?: string;
    bankName?: string; bankIBAN?: string; bankTitle?: string;
  }>({});
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
    // Fetch hostel payment details
    fetch(`/api/hostels/${hostelId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && d.id) {
          setHostelPayment({
            jazzCashNumber: d.jazzCashNumber || "",
            jazzCashTitle: d.jazzCashTitle || "",
            easyPaisaNumber: d.easyPaisaNumber || "",
            easyPaisaTitle: d.easyPaisaTitle || "",
            bankName: d.bankName || "",
            bankIBAN: d.bankIBAN || "",
            bankTitle: d.bankTitle || "",
          });
        }
      })
      .catch(() => {});
  }, [fetchBill, hostelId]);

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

  const openEditModal = () => {
    if (!bill) return;
    setEditForm({
      roomRent: String(bill.roomRent),
      foodCharges: String(bill.foodCharges),
      otherCharges: String(bill.otherCharges),
      meterCharges: String(bill.meterCharges),
      parkingFee: String(bill.parkingFee),
      discount: String(bill.discount || 0),
      discountReason: (bill as any).discountReason || "",
      notes: bill.notes || "",
      dueDate: bill.dueDate ? new Date(bill.dueDate).toISOString().split("T")[0] : "",
    });
    setEditModal(true);
  };

  const handleEditBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bill) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/hostels/${hostelId}/billing/${residentId}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: bill.id,
          roomRent: parseFloat(editForm.roomRent) || 0,
          foodCharges: parseFloat(editForm.foodCharges) || 0,
          otherCharges: parseFloat(editForm.otherCharges) || 0,
          meterCharges: parseFloat(editForm.meterCharges) || 0,
          parkingFee: parseFloat(editForm.parkingFee) || 0,
          discount: parseFloat(editForm.discount) || 0,
          discountReason: editForm.discountReason || null,
          notes: editForm.notes || null,
          dueDate: editForm.dueDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { addToast(data.error || "Failed to update bill", "error"); return; }
      addToast("Bill updated successfully", "success");
      setEditModal(false);
      fetchBill();
    } catch { addToast("Failed to update bill", "error"); }
    finally { setEditSubmitting(false); }
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
          {canEdit && (
            <button
              onClick={openEditModal}
              className="btn-secondary flex items-center gap-2"
            >
              <Edit2 size={16} />
              <span className="hidden sm:inline">Edit</span> Bill
            </button>
          )}
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
          {bill.paidAmount === 0 && canEdit && (
            <button
              onClick={async () => {
                if (!confirm("Delete this bill? This cannot be undone.")) return;
                try {
                  const res = await fetch(`/api/hostels/${hostelId}/billing?deleteBillId=${bill.id}`, { method: "DELETE" });
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
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="section-title">Bill Breakdown</h3>
                {bill.notes && (
                  <p className="text-xs text-primary font-medium mt-0.5">{bill.notes}</p>
                )}
              </div>
              {getStatusBadge(bill.status)}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary dark:text-gray-400">Room Rent</span>
                <span className="font-medium text-text-primary dark:text-white">
                  {formatCurrency(bill.roomRent)}
                </span>
              </div>
              {(bill.fixedFoodFee > 0 || bill.foodCharges > 0) && (
                <>
                  {bill.fixedFoodFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary dark:text-gray-400">Mess Fee (Fixed)</span>
                      <span className="font-medium text-text-primary dark:text-white">
                        {formatCurrency(bill.fixedFoodFee)}
                      </span>
                    </div>
                  )}
                  {bill.foodCharges > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary dark:text-gray-400">Food Orders (App)</span>
                      <span className="font-medium text-text-primary dark:text-white">
                        {formatCurrency(bill.foodCharges)}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary dark:text-gray-400">Parking Fee</span>
                <span className="font-medium text-text-primary dark:text-white">
                  {formatCurrency(bill.parkingFee)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary dark:text-gray-400">Electricity (Meter)</span>
                <span className="font-medium text-text-primary dark:text-white">
                  {formatCurrency(bill.meterCharges)}
                </span>
              </div>
              {bill.otherCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Other Charges</span>
                  <span className="font-medium text-text-primary dark:text-white">
                    {formatCurrency(bill.otherCharges)}
                  </span>
                </div>
              )}
              {bill.previousBalance > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Previous Balance</span>
                  <span className="font-medium text-warning">
                    + {formatCurrency(bill.previousBalance)}
                  </span>
                </div>
              )}
              {bill.advanceDeduction > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Advance Deduction</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    - {formatCurrency(bill.advanceDeduction)}
                  </span>
                </div>
              )}
              {(bill.discount || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Discount</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    - {formatCurrency(bill.discount || 0)}
                  </span>
                </div>
              )}

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

        {/* Resident Info + Payment Methods */}
        <div className="space-y-4">
          {/* How to Pay */}
          {bill.balance > 0 && (hostelPayment.jazzCashNumber || hostelPayment.easyPaisaNumber || hostelPayment.bankIBAN) && (
            <div className="card border-2 border-primary/20">
              <h3 className="section-title mb-3 text-primary">How to Pay</h3>
              <div className="space-y-3">
                {hostelPayment.jazzCashNumber && (
                  <div className="p-3 rounded-xl bg-[#CC0000]/5 border border-[#CC0000]/20">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded bg-[#CC0000] flex items-center justify-center shrink-0">
                        <span className="text-white text-[9px] font-bold">JC</span>
                      </div>
                      <span className="font-semibold text-sm text-[#CC0000]">JazzCash</span>
                    </div>
                    <p className="text-sm font-bold font-mono">{hostelPayment.jazzCashNumber}</p>
                    {hostelPayment.jazzCashTitle && (
                      <p className="text-xs text-text-muted">{hostelPayment.jazzCashTitle}</p>
                    )}
                  </div>
                )}
                {hostelPayment.easyPaisaNumber && (
                  <div className="p-3 rounded-xl bg-[#00A651]/5 border border-[#00A651]/20">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded bg-[#00A651] flex items-center justify-center shrink-0">
                        <span className="text-white text-[9px] font-bold">EP</span>
                      </div>
                      <span className="font-semibold text-sm text-[#00A651]">EasyPaisa</span>
                    </div>
                    <p className="text-sm font-bold font-mono">{hostelPayment.easyPaisaNumber}</p>
                    {hostelPayment.easyPaisaTitle && (
                      <p className="text-xs text-text-muted">{hostelPayment.easyPaisaTitle}</p>
                    )}
                  </div>
                )}
                {hostelPayment.bankIBAN && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Landmark size={14} className="text-primary shrink-0" />
                      <span className="font-semibold text-sm text-primary">{hostelPayment.bankName || "Bank Transfer"}</span>
                    </div>
                    <p className="text-xs font-mono text-text-secondary break-all">{hostelPayment.bankIBAN}</p>
                    {hostelPayment.bankTitle && (
                      <p className="text-xs text-text-muted mt-0.5">{hostelPayment.bankTitle}</p>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-text-muted">Send payment proof via WhatsApp or attach below</p>
              </div>
            </div>
          )}

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
        </div> {/* end sidebar space-y-4 */}
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
        {/* Bill Notes / Activity */}
        {bill.notes && (
          <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/15">
            <p className="text-xs font-semibold text-primary mb-1">📋 Bill Notes</p>
            <p className="text-sm text-text-secondary dark:text-gray-300">{bill.notes}</p>
          </div>
        )}
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

      {/* Edit Bill Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Bill"
        maxWidth="max-w-[600px]"
      >
        <form onSubmit={handleEditBill} className="space-y-4">
          {/* Info */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-primary">
            <Info size={14} className="shrink-0 mt-0.5" />
            <p>Editing a bill recalculates the total automatically. Previous balance and advance deduction are preserved. Payments already recorded are not affected.</p>
          </div>

          {/* Charges grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Room Rent (PKR)</label>
              <input type="number" value={editForm.roomRent}
                onChange={e => setEditForm(f => ({ ...f, roomRent: e.target.value }))}
                className="input" min="0" step="1" required />
            </div>
            <div>
              <label className="label">Mess Fee / Fixed Food (PKR)</label>
              <input type="number" value={editForm.foodCharges}
                onChange={e => setEditForm(f => ({ ...f, foodCharges: e.target.value }))}
                className="input" min="0" step="1" />
              <p className="text-[10px] text-text-muted mt-1">Food orders + fixed mess fee combined</p>
            </div>
            <div>
              <label className="label">Electricity / Meter (PKR)</label>
              <input type="number" value={editForm.meterCharges}
                onChange={e => setEditForm(f => ({ ...f, meterCharges: e.target.value }))}
                className="input" min="0" step="1" />
            </div>
            <div>
              <label className="label">Parking Fee (PKR)</label>
              <input type="number" value={editForm.parkingFee}
                onChange={e => setEditForm(f => ({ ...f, parkingFee: e.target.value }))}
                className="input" min="0" step="1" />
            </div>
            <div>
              <label className="label">Other Charges (PKR)</label>
              <input type="number" value={editForm.otherCharges}
                onChange={e => setEditForm(f => ({ ...f, otherCharges: e.target.value }))}
                className="input" min="0" step="1" />
              <p className="text-[10px] text-text-muted mt-1">Any extra charges (laundry, fines, etc.)</p>
            </div>
            <div>
              <label className="label">Discount (PKR)</label>
              <input type="number" value={editForm.discount}
                onChange={e => setEditForm(f => ({ ...f, discount: e.target.value }))}
                className="input" min="0" step="1" />
            </div>
          </div>

          {parseFloat(editForm.discount) > 0 && (
            <div>
              <label className="label">Discount Reason</label>
              <input type="text" value={editForm.discountReason}
                onChange={e => setEditForm(f => ({ ...f, discountReason: e.target.value }))}
                className="input" placeholder="e.g., Scholarship, Early payment, Special case..." />
            </div>
          )}

          <div>
            <label className="label">Due Date</label>
            <input type="date" value={editForm.dueDate}
              onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))}
              className="input" />
          </div>

          <div>
            <label className="label">Notes (Optional)</label>
            <textarea value={editForm.notes}
              onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
              className="textarea" rows={2}
              placeholder="Any notes about this bill (visible in bill detail)..." />
          </div>

          {/* Live total preview */}
          {bill && (
            <div className="p-3 rounded-xl bg-bg-main dark:bg-[#0B1222] border border-border dark:border-[#1E2D42]">
              <p className="text-xs font-semibold text-text-muted uppercase mb-2">Recalculated Total</p>
              <div className="space-y-1 text-xs">
                {[
                  { label: "Room Rent", val: parseFloat(editForm.roomRent) || 0 },
                  { label: "Food / Mess", val: parseFloat(editForm.foodCharges) || 0 },
                  { label: "Electricity", val: parseFloat(editForm.meterCharges) || 0 },
                  { label: "Parking", val: parseFloat(editForm.parkingFee) || 0 },
                  { label: "Other", val: parseFloat(editForm.otherCharges) || 0 },
                  { label: "Previous Balance", val: bill.previousBalance },
                ].map(({ label, val }) => val > 0 ? (
                  <div key={label} className="flex justify-between text-text-secondary dark:text-gray-400">
                    <span>{label}</span><span>{formatCurrency(val)}</span>
                  </div>
                ) : null)}
                {(parseFloat(editForm.discount) > 0 || bill.advanceDeduction > 0) && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Deductions (Advance + Discount)</span>
                    <span>- {formatCurrency((parseFloat(editForm.discount) || 0) + bill.advanceDeduction)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-border dark:border-[#1E2D42]">
                  <span className="text-text-primary dark:text-white">New Total</span>
                  <span className="text-primary">{formatCurrency(Math.max(0,
                    (parseFloat(editForm.roomRent)||0) + (parseFloat(editForm.foodCharges)||0) +
                    (parseFloat(editForm.meterCharges)||0) + (parseFloat(editForm.parkingFee)||0) +
                    (parseFloat(editForm.otherCharges)||0) + bill.previousBalance -
                    (parseFloat(editForm.discount)||0) - bill.advanceDeduction
                  ))}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={editSubmitting} className="btn-primary flex items-center gap-2">
              {editSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Edit2 size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
