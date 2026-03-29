"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/ui/stat-card";
import Modal from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import {
  formatCurrency,
  formatCNIC,
  formatDate,
  getInitials,
} from "@/lib/utils";
import {
  ArrowLeft,
  Edit,
  LogOut,
  DollarSign,
  CreditCard,
  Shield,
  TrendingDown,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building2,
  BedDouble,
  Heart,
  Droplets,
  GraduationCap,
  User,
  Loader2,
  UtensilsCrossed,
  MessageSquare,
  FileText,
} from "lucide-react";

interface PaymentData {
  id: string;
  amount: number;
  method: string;
  date: string;
  receiptNumber: string | null;
  notes: string | null;
  bill: { id: string; month: number; year: number };
}

interface FoodOrderData {
  id: string;
  quantity: number;
  totalAmount: number;
  orderDate: string;
  status: string;
  menu: { id: string; itemName: string; mealType: string };
}

interface MonthlyBillData {
  id: string;
  month: number;
  year: number;
  roomRent: number;
  foodCharges: number;
  fixedFoodFee: number;
  otherCharges: number;
  meterCharges: number;
  parkingFee: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  dueDate: string | null;
}

interface ComplaintData {
  id: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

interface ResidentDetail {
  id: string;
  status: string;
  moveInDate: string;
  moveOutDate: string | null;
  advancePaid: number;
  securityDeposit: number;
  gender: string | null;
  institution: string | null;
  bloodGroup: string | null;
  medicalCondition: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  photo: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    cnic: string | null;
    image: string | null;
  };
  room: {
    id: string;
    roomNumber: string;
    type: string;
    rentPerBed: number;
    floor: {
      id: string;
      name: string;
      floorNumber: number;
      building: { id: string; name: string };
    };
  };
  bed: { id: string; bedNumber: string; status: string };
  foodPlan: string;
  customFoodFee: number;
  payments: PaymentData[];
  foodOrders: FoodOrderData[];
  complaints: ComplaintData[];
  monthlyBills: MonthlyBillData[];
  financialSummary: {
    totalPaid: number;
    totalBilled: number;
    outstandingBalance: number;
    advanceLeft: number;
    securityDeposit: number;
  };
}

const AVATAR_COLORS = [
  "#4F46E5",
  "#7C3AED",
  "#DB2777",
  "#DC2626",
  "#EA580C",
  "#D97706",
  "#059669",
  "#0891B2",
  "#2563EB",
  "#4338CA",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const MONTH_NAMES = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function ResidentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hostelId = params.id as string;
  const residentId = params.residentId as string;

  const [resident, setResident] = useState<ResidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "payments" | "food" | "complaints" | "billing"
  >("payments");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Edit form
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCnic, setEditCnic] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editInstitution, setEditInstitution] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");
  const [editMedicalCondition, setEditMedicalCondition] = useState("");
  const [editEmergencyContact, setEditEmergencyContact] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");

  const fetchResident = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/hostels/${hostelId}/residents/${residentId}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setResident(data);
    } catch (error) {
      console.error("Error fetching resident:", error);
    } finally {
      setLoading(false);
    }
  }, [hostelId, residentId]);

  useEffect(() => {
    fetchResident();
  }, [fetchResident]);

  // Open edit modal if ?edit=true
  useEffect(() => {
    if (searchParams.get("edit") === "true" && resident) {
      openEditModal();
    }
  }, [searchParams, resident]);

  const openEditModal = () => {
    if (!resident) return;
    setEditName(resident.user.name);
    setEditEmail(resident.user.email);
    setEditPhone(resident.user.phone || "");
    setEditCnic(resident.user.cnic || "");
    setEditGender(resident.gender || "");
    setEditInstitution(resident.institution || "");
    setEditBloodGroup(resident.bloodGroup || "");
    setEditMedicalCondition(resident.medicalCondition || "");
    setEditEmergencyContact(resident.emergencyContact || "");
    setEditEmergencyPhone(resident.emergencyPhone || "");
    setEditError("");
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editName.trim()) {
      setEditError("Name is required");
      return;
    }
    if (!editEmail.trim()) {
      setEditError("Email is required");
      return;
    }

    try {
      setEditLoading(true);
      setEditError("");
      const res = await fetch(
        `/api/hostels/${hostelId}/residents/${residentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
            email: editEmail.trim(),
            phone: editPhone.trim() || null,
            cnic: editCnic.replace(/\D/g, "") || null,
            gender: editGender || null,
            institution: editInstitution.trim() || null,
            bloodGroup: editBloodGroup || null,
            medicalCondition: editMedicalCondition.trim() || null,
            emergencyContact: editEmergencyContact.trim() || null,
            emergencyPhone: editEmergencyPhone.trim() || null,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      setShowEditModal(false);
      fetchResident();
    } catch (err: any) {
      setEditError(err.message || "Failed to update resident");
    } finally {
      setEditLoading(false);
    }
  };

  const handleCheckout = async () => {
    try {
      setCheckoutLoading(true);
      const res = await fetch(
        `/api/hostels/${hostelId}/residents/${residentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "checkout" }),
        }
      );
      if (!res.ok) throw new Error("Failed to checkout");
      setShowCheckoutDialog(false);
      fetchResident();
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Resident Profile" hostelId={hostelId}>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!resident) {
    return (
      <DashboardLayout title="Resident Profile" hostelId={hostelId}>
        <div className="text-center py-20">
          <p className="text-text-muted">Resident not found</p>
          <button
            onClick={() => router.push(`/hostel/${hostelId}/residents`)}
            className="btn-primary mt-4"
          >
            Back to Residents
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const initials = getInitials(resident.user.name);
  const avatarColor = getAvatarColor(resident.user.name);

  const statusMap: Record<string, { class: string; label: string }> = {
    ACTIVE: { class: "badge-success", label: "Active" },
    CHECKED_OUT: { class: "badge-danger", label: "Checked Out" },
    SUSPENDED: { class: "badge-warning", label: "Suspended" },
  };
  const statusInfo = statusMap[resident.status] || {
    class: "badge-primary",
    label: resident.status,
  };

  return (
    <DashboardLayout title="Resident Profile" hostelId={hostelId}>
      {/* Back button */}
      <button
        onClick={() => router.push(`/hostel/${hostelId}/residents`)}
        className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary dark:hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Residents
      </button>

      {/* Profile Header */}
      <div
        className="card p-6 mb-6 opacity-0 animate-fade-in-up"
        style={{ animationDelay: "0ms" }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          {resident.user.image || resident.photo ? (
            <img
              src={resident.user.image || resident.photo || ""}
              alt={resident.user.name}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-text-primary dark:text-white">
                {resident.user.name}
              </h1>
              <span className={statusInfo.class}>{statusInfo.label}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Mail size={14} className="text-text-muted flex-shrink-0" />
                <span className="truncate">{resident.user.email}</span>
              </div>
              {resident.user.phone && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Phone size={14} className="text-text-muted flex-shrink-0" />
                  {resident.user.phone}
                </div>
              )}
              {resident.user.cnic && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <CreditCard
                    size={14}
                    className="text-text-muted flex-shrink-0"
                  />
                  <span className="font-mono">
                    {formatCNIC(resident.user.cnic)}
                  </span>
                </div>
              )}
              {resident.gender && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <User size={14} className="text-text-muted flex-shrink-0" />
                  {resident.gender}
                </div>
              )}
              {resident.institution && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <GraduationCap
                    size={14}
                    className="text-text-muted flex-shrink-0"
                  />
                  {resident.institution}
                </div>
              )}
              {resident.bloodGroup && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Droplets
                    size={14}
                    className="text-text-muted flex-shrink-0"
                  />
                  {resident.bloodGroup}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={openEditModal}
              className="btn-secondary flex items-center gap-2"
            >
              <Edit size={16} />
              Edit
            </button>
            {resident.status === "ACTIVE" && (
              <button
                onClick={() => setShowCheckoutDialog(true)}
                className="btn-danger flex items-center gap-2"
              >
                <LogOut size={16} />
                Checkout
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Current Room Card */}
      <div
        className="card p-6 mb-6 opacity-0 animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <h2 className="section-title mb-4">Current Room</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-text-muted mb-1">Building</p>
            <div className="flex items-center gap-1.5">
              <Building2 size={14} className="text-primary" />
              <span className="text-sm font-medium text-text-primary dark:text-white">
                {resident.room.floor.building.name}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Floor</p>
            <span className="text-sm font-medium text-text-primary dark:text-white">
              {resident.room.floor.name}
            </span>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Room</p>
            <span className="text-sm font-medium text-text-primary dark:text-white">
              {resident.room.roomNumber} ({resident.room.type})
            </span>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Bed</p>
            <div className="flex items-center gap-1.5">
              <BedDouble size={14} className="text-primary" />
              <span className="text-sm font-medium text-text-primary dark:text-white">
                {resident.bed.bedNumber}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Rent / Month</p>
            <span className="text-sm font-bold text-primary">
              {formatCurrency(resident.room.rentPerBed)}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border dark:border-[#1E2D42] flex items-center gap-2 text-sm text-text-muted">
          <Calendar size={14} />
          Move-in: {formatDate(resident.moveInDate)}
          {resident.moveOutDate && (
            <span className="ml-4">
              Move-out: {formatDate(resident.moveOutDate)}
            </span>
          )}
        </div>
      </div>

      {/* Agreement Details Card */}
      <div
        className="card p-6 mb-6 opacity-0 animate-fade-in-up"
        style={{ animationDelay: "150ms" }}
      >
        <h2 className="section-title mb-4">Agreement Details</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-xs text-text-muted mb-1">Move-in Date</p>
            <span className="text-sm font-medium text-text-primary dark:text-white">
              {formatDate(resident.moveInDate)}
            </span>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Monthly Rent</p>
            <span className="text-sm font-bold text-primary">
              {formatCurrency(resident.room.rentPerBed)}
            </span>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Advance Paid</p>
            <span className="text-sm font-medium text-text-primary dark:text-white">
              {formatCurrency(resident.advancePaid)}
            </span>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Security Deposit</p>
            <span className="text-sm font-medium text-text-primary dark:text-white">
              {formatCurrency(resident.securityDeposit)}
            </span>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Food Plan</p>
            <span className="text-sm font-medium text-text-primary dark:text-white">
              {resident.foodPlan === "FULL_MESS"
                ? "Full Mess"
                : resident.foodPlan === "NO_MESS"
                ? "No Mess"
                : `Custom (${formatCurrency(resident.customFoodFee)})`}
            </span>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Status</p>
            <span className={statusInfo.class}>{statusInfo.label}</span>
          </div>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Paid"
          value={formatCurrency(resident.financialSummary.totalPaid)}
          icon={DollarSign}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          delay={200}
        />
        <StatCard
          label="Outstanding Balance"
          value={formatCurrency(resident.financialSummary.outstandingBalance)}
          icon={TrendingDown}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          delay={250}
        />
        <StatCard
          label="Advance Left"
          value={formatCurrency(resident.financialSummary.advanceLeft)}
          icon={CreditCard}
          iconBg="#EEF2FF"
          iconColor="#4F46E5"
          delay={300}
        />
        <StatCard
          label="Security Deposit"
          value={formatCurrency(resident.financialSummary.securityDeposit)}
          icon={Shield}
          iconBg="#FFFBEB"
          iconColor="#F59E0B"
          delay={350}
        />
      </div>

      {/* Tabs */}
      <div
        className="opacity-0 animate-fade-in-up"
        style={{ animationDelay: "400ms" }}
      >
        <div className="flex items-center gap-1 mb-4 bg-white dark:bg-[#111C2E] rounded-xl p-1 shadow-sm border border-border dark:border-[#1E2D42] w-fit">
          {[
            { key: "payments" as const, label: "Payment History", icon: DollarSign },
            { key: "food" as const, label: "Food Orders", icon: UtensilsCrossed },
            { key: "billing" as const, label: "Billing History", icon: FileText },
            { key: "complaints" as const, label: "Complaints", icon: MessageSquare },
          ].map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-main dark:hover:bg-[#0B1222]"
                }`}
              >
                <TabIcon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Payment History Tab */}
        {activeTab === "payments" && (
          <div className="card p-0 overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Amount</th>
                    <th className="table-header">Method</th>
                    <th className="table-header">Receipt #</th>
                    <th className="table-header">Bill Period</th>
                    <th className="table-header">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {resident.payments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-text-muted text-sm"
                      >
                        No payment records found
                      </td>
                    </tr>
                  ) : (
                    resident.payments.map((payment) => (
                      <tr key={payment.id} className="table-row">
                        <td className="table-cell text-sm">
                          {formatDate(payment.date)}
                        </td>
                        <td className="table-cell text-sm font-semibold text-success">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="table-cell">
                          <span className="badge-primary">{payment.method}</span>
                        </td>
                        <td className="table-cell text-sm font-mono">
                          {payment.receiptNumber || "-"}
                        </td>
                        <td className="table-cell text-sm">
                          {MONTH_NAMES[payment.bill.month]} {payment.bill.year}
                        </td>
                        <td className="table-cell text-sm text-text-muted">
                          {payment.notes || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile view */}
            <div className="md:hidden divide-y divide-border dark:divide-[#1E2D42]">
              {resident.payments.length === 0 ? (
                <div className="px-4 py-12 text-center text-text-muted text-sm">
                  No payment records found
                </div>
              ) : (
                resident.payments.map((payment) => (
                  <div key={payment.id} className="p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">
                        {formatDate(payment.date)}
                      </span>
                      <span className="text-sm font-bold text-success">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-text-muted">
                      <span>{payment.method}</span>
                      <span>{payment.receiptNumber || "-"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Food Orders Tab */}
        {activeTab === "food" && (
          <div className="card p-0 overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Item</th>
                    <th className="table-header">Meal</th>
                    <th className="table-header">Qty</th>
                    <th className="table-header">Amount</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resident.foodOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-text-muted text-sm"
                      >
                        No food orders found
                      </td>
                    </tr>
                  ) : (
                    resident.foodOrders.map((order) => {
                      const orderStatusMap: Record<string, { bg: string; text: string; label: string }> = {
                        PENDING: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", label: "Pending" },
                        PREPARING: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", label: "Preparing" },
                        DELIVERED: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "Delivered" },
                        CANCELLED: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Cancelled" },
                      };
                      const os = orderStatusMap[order.status] || { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-400", label: order.status };
                      return (
                      <tr key={order.id} className="table-row">
                        <td className="table-cell text-sm">
                          {formatDate(order.orderDate)}
                        </td>
                        <td className="table-cell text-sm font-medium">
                          {order.menu.itemName}
                        </td>
                        <td className="table-cell">
                          <span className="badge-primary">
                            {order.menu.mealType}
                          </span>
                        </td>
                        <td className="table-cell text-sm">{order.quantity}</td>
                        <td className="table-cell text-sm font-semibold">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="table-cell">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${os.bg} ${os.text}`}>
                            {os.label}
                          </span>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-border dark:divide-[#1E2D42]">
              {resident.foodOrders.length === 0 ? (
                <div className="px-4 py-12 text-center text-text-muted text-sm">
                  No food orders found
                </div>
              ) : (
                resident.foodOrders.map((order) => {
                  const orderStatusMap: Record<string, { bg: string; text: string; label: string }> = {
                    PENDING: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", label: "Pending" },
                    PREPARING: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", label: "Preparing" },
                    DELIVERED: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "Delivered" },
                    CANCELLED: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Cancelled" },
                  };
                  const os = orderStatusMap[order.status] || { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-400", label: order.status };
                  return (
                  <div key={order.id} className="p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">
                        {order.menu.itemName}
                      </span>
                      <span className="text-sm font-bold">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-text-muted">
                      <span>
                        {order.menu.mealType} x{order.quantity}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${os.bg} ${os.text}`}>
                        {os.label}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted">{formatDate(order.orderDate)}</div>
                  </div>
                  );
                }))
              )}
            </div>
          </div>
        )}

        {/* Complaints Tab */}
        {activeTab === "complaints" && (
          <div className="card p-0 overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Category</th>
                    <th className="table-header">Description</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  {resident.complaints.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-text-muted text-sm"
                      >
                        No complaints found
                      </td>
                    </tr>
                  ) : (
                    resident.complaints.map((complaint) => {
                      const complaintStatusMap: Record<
                        string,
                        { class: string; label: string }
                      > = {
                        OPEN: { class: "badge-danger", label: "Open" },
                        IN_PROGRESS: {
                          class: "badge-warning",
                          label: "In Progress",
                        },
                        RESOLVED: { class: "badge-success", label: "Resolved" },
                        CLOSED: { class: "badge-primary", label: "Closed" },
                      };
                      const cs = complaintStatusMap[complaint.status] || {
                        class: "badge-primary",
                        label: complaint.status,
                      };

                      return (
                        <tr key={complaint.id} className="table-row">
                          <td className="table-cell text-sm">
                            {formatDate(complaint.createdAt)}
                          </td>
                          <td className="table-cell text-sm font-medium">
                            {complaint.category}
                          </td>
                          <td className="table-cell text-sm text-text-secondary max-w-[300px] truncate">
                            {complaint.description}
                          </td>
                          <td className="table-cell">
                            <span className={cs.class}>{cs.label}</span>
                          </td>
                          <td className="table-cell text-sm">
                            {complaint.resolvedAt
                              ? formatDate(complaint.resolvedAt)
                              : "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-border dark:divide-[#1E2D42]">
              {resident.complaints.length === 0 ? (
                <div className="px-4 py-12 text-center text-text-muted text-sm">
                  No complaints found
                </div>
              ) : (
                resident.complaints.map((complaint) => {
                  const complaintStatusMap: Record<
                    string,
                    { class: string; label: string }
                  > = {
                    OPEN: { class: "badge-danger", label: "Open" },
                    IN_PROGRESS: {
                      class: "badge-warning",
                      label: "In Progress",
                    },
                    RESOLVED: { class: "badge-success", label: "Resolved" },
                    CLOSED: { class: "badge-primary", label: "Closed" },
                  };
                  const cs = complaintStatusMap[complaint.status] || {
                    class: "badge-primary",
                    label: complaint.status,
                  };

                  return (
                    <div key={complaint.id} className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium">
                          {complaint.category}
                        </span>
                        <span className={cs.class}>{cs.label}</span>
                      </div>
                      <p className="text-xs text-text-muted line-clamp-2">
                        {complaint.description}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatDate(complaint.createdAt)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Billing History Tab */}
        {activeTab === "billing" && (
          <div className="card p-0 overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Period</th>
                    <th className="table-header">Room Rent</th>
                    <th className="table-header">Food Charges</th>
                    <th className="table-header">Other</th>
                    <th className="table-header">Total</th>
                    <th className="table-header">Paid</th>
                    <th className="table-header">Balance</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resident.monthlyBills.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-text-muted text-sm"
                      >
                        No billing records found
                      </td>
                    </tr>
                  ) : (
                    resident.monthlyBills.map((bill) => {
                      const billStatusMap: Record<string, { bg: string; text: string; label: string }> = {
                        UNPAID: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Unpaid" },
                        PARTIAL: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", label: "Partial" },
                        PAID: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "Paid" },
                        OVERDUE: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Overdue" },
                      };
                      const bs = billStatusMap[bill.status] || { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-400", label: bill.status };
                      const foodTotal = bill.foodCharges + bill.fixedFoodFee;
                      const otherTotal = bill.otherCharges + bill.meterCharges + bill.parkingFee;
                      return (
                        <tr key={bill.id} className="table-row">
                          <td className="table-cell text-sm font-medium">
                            {MONTH_NAMES[bill.month]} {bill.year}
                          </td>
                          <td className="table-cell text-sm">
                            {formatCurrency(bill.roomRent)}
                          </td>
                          <td className="table-cell text-sm">
                            {formatCurrency(foodTotal)}
                          </td>
                          <td className="table-cell text-sm">
                            {formatCurrency(otherTotal)}
                          </td>
                          <td className="table-cell text-sm font-semibold">
                            {formatCurrency(bill.totalAmount)}
                          </td>
                          <td className="table-cell text-sm text-success font-medium">
                            {formatCurrency(bill.paidAmount)}
                          </td>
                          <td className="table-cell text-sm font-semibold text-danger">
                            {formatCurrency(bill.balance)}
                          </td>
                          <td className="table-cell">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bs.bg} ${bs.text}`}>
                              {bs.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile view */}
            <div className="md:hidden divide-y divide-border dark:divide-[#1E2D42]">
              {resident.monthlyBills.length === 0 ? (
                <div className="px-4 py-12 text-center text-text-muted text-sm">
                  No billing records found
                </div>
              ) : (
                resident.monthlyBills.map((bill) => {
                  const billStatusMap: Record<string, { bg: string; text: string; label: string }> = {
                    UNPAID: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Unpaid" },
                    PARTIAL: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", label: "Partial" },
                    PAID: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "Paid" },
                    OVERDUE: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Overdue" },
                  };
                  const bs = billStatusMap[bill.status] || { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-400", label: bill.status };
                  return (
                    <div key={bill.id} className="p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-text-primary dark:text-white">
                          {MONTH_NAMES[bill.month]} {bill.year}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bs.bg} ${bs.text}`}>
                          {bs.label}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Total</span>
                        <span className="font-semibold text-text-primary dark:text-white">
                          {formatCurrency(bill.totalAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Paid</span>
                        <span className="text-success font-medium">
                          {formatCurrency(bill.paidAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Balance</span>
                        <span className="text-danger font-semibold">
                          {formatCurrency(bill.balance)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Personal Information"
        maxWidth="max-w-[640px]"
      >
        {editError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-danger">
            {editError}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <label className="label">
              Full Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">
              Email <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              type="text"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">CNIC</label>
            <input
              type="text"
              value={editCnic}
              onChange={(e) => setEditCnic(e.target.value)}
              className="input"
              placeholder="XXXXX-XXXXXXX-X"
            />
          </div>
          <div>
            <label className="label">Gender</label>
            <select
              value={editGender}
              onChange={(e) => setEditGender(e.target.value)}
              className="select"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Institution</label>
            <input
              type="text"
              value={editInstitution}
              onChange={(e) => setEditInstitution(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Blood Group</label>
            <select
              value={editBloodGroup}
              onChange={(e) => setEditBloodGroup(e.target.value)}
              className="select"
            >
              <option value="">Select Blood Group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
          <div>
            <label className="label">Medical Condition</label>
            <input
              type="text"
              value={editMedicalCondition}
              onChange={(e) => setEditMedicalCondition(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Emergency Contact</label>
            <input
              type="text"
              value={editEmergencyContact}
              onChange={(e) => setEditEmergencyContact(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Emergency Phone</label>
            <input
              type="text"
              value={editEmergencyPhone}
              onChange={(e) => setEditEmergencyPhone(e.target.value)}
              className="input"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border dark:border-[#1E2D42]">
          <button
            onClick={() => setShowEditModal(false)}
            className="btn-secondary"
            disabled={editLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleEditSubmit}
            className="btn-primary flex items-center gap-2"
            disabled={editLoading}
          >
            {editLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </Modal>

      {/* Checkout Confirm Dialog */}
      <ConfirmDialog
        isOpen={showCheckoutDialog}
        onClose={() => setShowCheckoutDialog(false)}
        onConfirm={handleCheckout}
        title="Checkout Resident"
        message={`Are you sure you want to checkout ${resident.user.name}? This will mark the resident as checked out, set the move-out date to today, and make their bed available.`}
        confirmText="Checkout"
        confirmVariant="danger"
        loading={checkoutLoading}
      />
    </DashboardLayout>
  );
}
