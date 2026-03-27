"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Modal from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Plus, Edit2, Trash2, Check, Building2, Users } from "lucide-react";

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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState(defaultForm);
  const [formError, setFormError] = useState("");

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

  useEffect(() => {
    fetchPlans();
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
        alert(data.error || "Failed to delete plan");
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
                    <div className="flex gap-4 mb-4">
                      <div
                        className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{ backgroundColor: bgColor }}
                      >
                        <Building2 size={16} style={{ color }} />
                        <span className="text-sm font-medium text-text-primary dark:text-white">
                          {plan.maxHostels} Hostels
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{ backgroundColor: bgColor }}
                      >
                        <Users size={16} style={{ color }} />
                        <span className="text-sm font-medium text-text-primary dark:text-white">
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
                              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: bgColor }}
                            >
                              <Check size={12} style={{ color }} />
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
