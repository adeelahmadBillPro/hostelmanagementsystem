"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Modal from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import FileUpload from "@/components/ui/file-upload";
import { Plus, Edit2, Trash2, Check, Building2, Users, Clock, CheckCircle2, XCircle, Loader2, Image as ImageIcon, Settings, Save, Smartphone, CreditCard, Banknote, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/providers";

interface Plan {
  id: string;
  name: string;
  price: number;
  maxHostels: number;
  maxResidents: number;
  features: string[];
  isActive: boolean;
  _count: { tenants: number };
  createdAt: string;
}

const defaultForm = {
  name: "",
  price: "",
  maxHostels: "",
  maxResidents: "",
  features: "",
};

export default function PlansPage() {
  const { addToast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState(defaultForm);
  const [formError, setFormError] = useState("");

  // Upgrade requests
  const [upgradeRequests, setUpgradeRequests] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [reviewLoading, setReviewLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Payment settings
  const [showPaymentSettings, setShowPaymentSettings] = useState(false);
  const [paySettings, setPaySettings] = useState<any>({});
  const [savingPaySettings, setSavingPaySettings] = useState(false);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/super-admin/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpgradeRequests = async () => {
    try {
      const res = await fetch("/api/plan-upgrade");
      if (res.ok) {
        const data = await res.json();
        setUpgradeRequests(data.requests || []);
        setPendingCount(data.stats?.pending || 0);
      }
    } catch { /* non-fatal */ }
  };

  const handleReview = async (requestId: string, action: "approve" | "reject") => {
    setReviewLoading(requestId);
    try {
      const res = await fetch("/api/plan-upgrade", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action, rejectionReason: action === "reject" ? rejectReason : undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message, "success");
        setRejectReason("");
        fetchUpgradeRequests();
      } else {
        addToast(data.error || "Failed", "error");
      }
    } catch {
      addToast("Something went wrong", "error");
    } finally {
      setReviewLoading(null);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await fetch("/api/super-admin/payment-settings");
      if (res.ok) setPaySettings(await res.json());
    } catch { /* non-fatal */ }
  };

  const savePaymentSettings = async () => {
    setSavingPaySettings(true);
    try {
      const res = await fetch("/api/super-admin/payment-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paySettings),
      });
      if (res.ok) addToast("Payment settings saved!", "success");
      else addToast("Failed to save", "error");
    } catch { addToast("Something went wrong", "error"); }
    finally { setSavingPaySettings(false); }
  };

  useEffect(() => {
    fetchPlans();
    fetchUpgradeRequests();
    fetchPaymentSettings();
  }, []);

  const openAddModal = () => {
    setEditingPlan(null);
    setFormData(defaultForm);
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price: String(plan.price),
      maxHostels: String(plan.maxHostels),
      maxResidents: String(plan.maxResidents),
      features: plan.features.join(", "),
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setActionLoading(true);

    const featuresArray = formData.features
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const payload = {
      name: formData.name,
      price: formData.price,
      maxHostels: formData.maxHostels,
      maxResidents: formData.maxResidents,
      features: featuresArray,
    };

    try {
      const url = editingPlan
        ? `/api/super-admin/plans/${editingPlan.id}`
        : "/api/super-admin/plans";
      const method = editingPlan ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Failed to save plan");
        return;
      }

      setModalOpen(false);
      setFormData(defaultForm);
      setEditingPlan(null);
      fetchPlans();
    } catch (error) {
      setFormError("An error occurred. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (plan: Plan) => {
    setDeletingPlan(plan);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingPlan) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/super-admin/plans/${deletingPlan.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        addToast(data.error || "Failed to delete plan", "error");
        return;
      }

      fetchPlans();
    } catch (error) {
      console.error("Failed to delete plan:", error);
    } finally {
      setActionLoading(false);
      setConfirmOpen(false);
      setDeletingPlan(null);
    }
  };

  const planColors = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#0EA5E9"];
  const planBgColors = ["#EEF2FF", "#ECFDF5", "#FFFBEB", "#FEF2F2", "#F0F9FF"];

  return (
    <DashboardLayout title="Subscription Plans">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Subscription Plans</h1>
            <p className="text-sm text-text-muted mt-1">
              Manage pricing plans for tenants
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Plan
          </button>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="card flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-text-muted">
              No plans created yet. Click &quot;Add Plan&quot; to create one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan, index) => {
              const color = planColors[index % planColors.length];
              const bgColor = planBgColors[index % planBgColors.length];

              return (
                <div
                  key={plan.id}
                  className="card opacity-0 animate-fade-in-up relative overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Color accent bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: color }}
                  />

                  <div className="pt-2">
                    {/* Plan header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary dark:text-white">
                          {plan.name}
                        </h3>
                        <div className="mt-1">
                          <span className="text-2xl font-bold" style={{ color }}>
                            PKR {plan.price.toLocaleString()}
                          </span>
                          <span className="text-text-muted text-sm">/month</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(plan)}
                          className="p-2 rounded-lg hover:bg-bg-main dark:hover:bg-[#111C2E] transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} className="text-text-muted" />
                        </button>
                        <button
                          onClick={() => handleDelete(plan)}
                          className="p-2 rounded-lg hover:bg-bg-main dark:hover:bg-[#111C2E] transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-danger" />
                        </button>
                      </div>
                    </div>

                    {/* Limits */}
                    <div className="flex gap-2 sm:gap-4 mb-4 flex-wrap">
                      <div
                        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg"
                        style={{ backgroundColor: bgColor }}
                      >
                        <Building2 size={14} className="sm:w-4 sm:h-4" style={{ color }} />
                        <span className="text-xs sm:text-sm font-medium text-text-primary dark:text-white">
                          {plan.maxHostels} Hostels
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg"
                        style={{ backgroundColor: bgColor }}
                      >
                        <Users size={14} className="sm:w-4 sm:h-4" style={{ color }} />
                        <span className="text-xs sm:text-sm font-medium text-text-primary dark:text-white">
                          {plan.maxResidents} Residents
                        </span>
                      </div>
                    </div>

                    {/* Features */}
                    {plan.features.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {plan.features.map((feature, fi) => (
                          <div key={fi} className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: bgColor }}
                            >
                              <Check size={10} className="sm:w-3 sm:h-3" style={{ color }} />
                            </div>
                            <span className="text-sm text-text-secondary dark:text-gray-300">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="pt-3 border-t border-border dark:border-[#1E2D42]">
                      <span className="text-xs text-text-muted">
                        {plan._count.tenants} tenant{plan._count.tenants !== 1 ? "s" : ""} subscribed
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Plan Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPlan ? "Edit Plan" : "Add New Plan"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="label">Plan Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="input"
              placeholder="e.g., Basic, Professional, Enterprise"
              required
            />
          </div>

          <div>
            <label className="label">Price (PKR / month)</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              className="input"
              placeholder="e.g., 5000"
              min="0"
              step="1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Max Hostels</label>
              <input
                type="number"
                value={formData.maxHostels}
                onChange={(e) =>
                  setFormData({ ...formData, maxHostels: e.target.value })
                }
                className="input"
                placeholder="e.g., 5"
                min="1"
                required
              />
            </div>
            <div>
              <label className="label">Max Residents</label>
              <input
                type="number"
                value={formData.maxResidents}
                onChange={(e) =>
                  setFormData({ ...formData, maxResidents: e.target.value })
                }
                className="input"
                placeholder="e.g., 100"
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Features (comma-separated)</label>
            <textarea
              value={formData.features}
              onChange={(e) =>
                setFormData({ ...formData, features: e.target.value })
              }
              className="textarea"
              placeholder="e.g., Room Management, Billing, Reports, Gate Pass"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={actionLoading}
            >
              {actionLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : editingPlan ? (
                "Update Plan"
              ) : (
                "Create Plan"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      {/* Upgrade Requests Section */}
      {upgradeRequests.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-text-primary dark:text-white mb-4 flex items-center gap-2">
            <Clock size={20} className="text-amber-500" />
            Plan Upgrade Requests
            {pendingCount > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">{pendingCount} pending</span>
            )}
          </h2>
          <div className="space-y-3">
            {upgradeRequests.map((req: any) => (
              <div key={req.id} className="card p-4 animate-fade-in">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-sm font-bold text-text-primary dark:text-white">{req.tenant?.name}</p>
                      <span className="text-xs text-text-muted">{req.tenant?.email}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-text-secondary dark:text-slate-400">
                      <span>Requesting: <strong className="text-primary">{req.requestedPlan?.name}</strong> ({req.requestedPlan?.price ? `PKR ${req.requestedPlan.price.toLocaleString()}/mo` : ""})</span>
                      <span>Paid: <strong>PKR {req.amount?.toLocaleString()}</strong> via {req.method}</span>
                      {req.transactionId && <span>TxID: {req.transactionId}</span>}
                      <span>{new Date(req.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    {req.proofImageUrl && (
                      <a href={req.proofImageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                        <ImageIcon size={12} /> View Payment Proof
                      </a>
                    )}
                    {req.notes && <p className="text-xs text-text-muted mt-1 italic">&quot;{req.notes}&quot;</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {req.status === "PENDING" ? (
                      <>
                        <button
                          onClick={() => handleReview(req.id, "approve")}
                          disabled={!!reviewLoading}
                          className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                        >
                          {reviewLoading === req.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt("Rejection reason (optional):");
                            if (reason !== null) {
                              setRejectReason(reason);
                              handleReview(req.id, "reject");
                            }
                          }}
                          disabled={!!reviewLoading}
                          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 text-red-500 hover:text-red-600"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </>
                    ) : req.status === "APPROVED" ? (
                      <span className="badge-success inline-flex items-center gap-1"><CheckCircle2 size={12} /> Approved</span>
                    ) : (
                      <div>
                        <span className="badge-danger inline-flex items-center gap-1"><XCircle size={12} /> Rejected</span>
                        {req.rejectionReason && <p className="text-xs text-red-400 mt-1">{req.rejectionReason}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Settings Section */}
      <div className="mt-8 card overflow-hidden">
        <button
          onClick={() => setShowPaymentSettings(!showPaymentSettings)}
          className="w-full flex items-center justify-between p-5 hover:bg-bg-main dark:hover:bg-[#0B1222] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings size={18} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-text-primary dark:text-white">Payment Account Settings</p>
              <p className="text-xs text-text-muted">Configure payment accounts shown to tenants during plan upgrade</p>
            </div>
          </div>
          {showPaymentSettings ? <ChevronUp size={18} className="text-text-muted" /> : <ChevronDown size={18} className="text-text-muted" />}
        </button>

        {showPaymentSettings && (
          <div className="border-t border-border dark:border-[#1E2D42] p-5 space-y-6">
            {/* Bank Transfer */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={16} className="text-primary" />
                <h4 className="font-semibold text-text-primary dark:text-white text-sm">Bank Transfer</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Bank Name</label>
                  <input className="input w-full" placeholder="e.g., HBL, Meezan, Allied" value={paySettings.bankName || ""} onChange={e => setPaySettings({...paySettings, bankName: e.target.value})} />
                </div>
                <div>
                  <label className="label">Account Title</label>
                  <input className="input w-full" placeholder="Account holder name" value={paySettings.bankTitle || ""} onChange={e => setPaySettings({...paySettings, bankTitle: e.target.value})} />
                </div>
                <div>
                  <label className="label">Account Number</label>
                  <input className="input w-full" placeholder="Account number" value={paySettings.bankAccount || ""} onChange={e => setPaySettings({...paySettings, bankAccount: e.target.value})} />
                </div>
                <div>
                  <label className="label">IBAN (optional)</label>
                  <input className="input w-full" placeholder="PK00XXXX..." value={paySettings.bankIban || ""} onChange={e => setPaySettings({...paySettings, bankIban: e.target.value})} />
                </div>
              </div>
              <div className="mt-3">
                <label className="label">QR Code Image (optional)</label>
                <FileUpload onUpload={url => setPaySettings({...paySettings, bankQrImage: url})} accept="image/*" label="Upload bank QR" currentUrl={paySettings.bankQrImage} />
              </div>
            </div>

            {/* JazzCash */}
            <div className="pt-4 border-t border-border dark:border-[#1E2D42]">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone size={16} className="text-emerald-500" />
                <h4 className="font-semibold text-text-primary dark:text-white text-sm">JazzCash</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">JazzCash Number</label>
                  <input className="input w-full" placeholder="03XX-XXXXXXX" value={paySettings.jazzcashNumber || ""} onChange={e => setPaySettings({...paySettings, jazzcashNumber: e.target.value})} />
                </div>
                <div>
                  <label className="label">Account Name</label>
                  <input className="input w-full" placeholder="Name on account" value={paySettings.jazzcashName || ""} onChange={e => setPaySettings({...paySettings, jazzcashName: e.target.value})} />
                </div>
              </div>
              <div className="mt-3">
                <label className="label">QR Code Image (optional)</label>
                <FileUpload onUpload={url => setPaySettings({...paySettings, jazzcashQrImage: url})} accept="image/*" label="Upload JazzCash QR" currentUrl={paySettings.jazzcashQrImage} />
              </div>
            </div>

            {/* EasyPaisa */}
            <div className="pt-4 border-t border-border dark:border-[#1E2D42]">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={16} className="text-amber-500" />
                <h4 className="font-semibold text-text-primary dark:text-white text-sm">EasyPaisa</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">EasyPaisa Number</label>
                  <input className="input w-full" placeholder="03XX-XXXXXXX" value={paySettings.easypaisaNumber || ""} onChange={e => setPaySettings({...paySettings, easypaisaNumber: e.target.value})} />
                </div>
                <div>
                  <label className="label">Account Name</label>
                  <input className="input w-full" placeholder="Name on account" value={paySettings.easypaisaName || ""} onChange={e => setPaySettings({...paySettings, easypaisaName: e.target.value})} />
                </div>
              </div>
              <div className="mt-3">
                <label className="label">QR Code Image (optional)</label>
                <FileUpload onUpload={url => setPaySettings({...paySettings, easypaisaQrImage: url})} accept="image/*" label="Upload EasyPaisa QR" currentUrl={paySettings.easypaisaQrImage} />
              </div>
            </div>

            {/* Cash */}
            <div className="pt-4 border-t border-border dark:border-[#1E2D42]">
              <div className="flex items-center gap-2 mb-3">
                <Banknote size={16} className="text-blue-500" />
                <h4 className="font-semibold text-text-primary dark:text-white text-sm">Cash Payment Instructions</h4>
              </div>
              <textarea className="input w-full min-h-[70px] resize-none" placeholder="e.g., Visit our office at XYZ address. Contact: 03XX-XXXXXXX" value={paySettings.cashInstructions || ""} onChange={e => setPaySettings({...paySettings, cashInstructions: e.target.value})} />
            </div>

            <button onClick={savePaymentSettings} disabled={savingPaySettings} className="btn-primary flex items-center gap-2">
              {savingPaySettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {savingPaySettings ? "Saving..." : "Save Payment Settings"}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setDeletingPlan(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Plan"
        message={`Are you sure you want to delete the "${deletingPlan?.name}" plan? This action cannot be undone.`}
        confirmText="Delete Plan"
        confirmVariant="danger"
        loading={actionLoading}
      />
    </DashboardLayout>
  );
}
