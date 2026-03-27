"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import DataTable from "@/components/ui/data-table";
import Modal from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  planId: string | null;
  plan: { id: string; name: string } | null;
  _count: { hostels: number; users: number };
  createdAt: string;
}

interface Plan {
  id: string;
  name: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmText: string;
    variant: "danger" | "primary" | "success";
    onConfirm: () => void;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    planId: "",
  });
  const [formError, setFormError] = useState("");

  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/super-admin/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
      }
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/super-admin/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchPlans();
  }, []);

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setActionLoading(true);

    try {
      const res = await fetch("/api/super-admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          planId: formData.planId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Failed to create tenant");
        return;
      }

      setModalOpen(false);
      setFormData({ name: "", email: "", phone: "", planId: "" });
      fetchTenants();
    } catch (error) {
      setFormError("An error occurred. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = (tenant: Tenant) => {
    const newStatus = tenant.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const actionLabel = newStatus === "ACTIVE" ? "Enable" : "Disable";

    setConfirmAction({
      title: `${actionLabel} Tenant`,
      message: `Are you sure you want to ${actionLabel.toLowerCase()} "${tenant.name}"? ${
        newStatus === "INACTIVE"
          ? "This will restrict their access to the platform."
          : "This will restore their access to the platform."
      }`,
      confirmText: actionLabel,
      variant: newStatus === "ACTIVE" ? "success" : "primary",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`/api/super-admin/tenants/${tenant.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          });
          if (res.ok) {
            fetchTenants();
          }
        } catch (error) {
          console.error("Failed to update tenant:", error);
        } finally {
          setActionLoading(false);
          setConfirmOpen(false);
        }
      },
    });
    setConfirmOpen(true);
  };

  const handleDelete = (tenant: Tenant) => {
    setConfirmAction({
      title: "Delete Tenant",
      message: `Are you sure you want to permanently delete "${tenant.name}"? This action cannot be undone and will remove all associated data including hostels, residents, and billing records.`,
      confirmText: "Delete",
      variant: "danger",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`/api/super-admin/tenants/${tenant.id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            fetchTenants();
          }
        } catch (error) {
          console.error("Failed to delete tenant:", error);
        } finally {
          setActionLoading(false);
          setConfirmOpen(false);
        }
      },
    });
    setConfirmOpen(true);
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (row: Tenant) => (
        <span className="font-medium text-text-primary dark:text-white">
          {row.name}
        </span>
      ),
    },
    {
      key: "email",
      label: "Email",
    },
    {
      key: "plan",
      label: "Plan",
      render: (row: Tenant) => (
        <span className="badge-primary">{row.plan?.name || "No Plan"}</span>
      ),
    },
    {
      key: "hostels",
      label: "Hostels",
      render: (row: Tenant) => row._count.hostels,
    },
    {
      key: "status",
      label: "Status",
      render: (row: Tenant) => (
        <span
          className={
            row.status === "ACTIVE"
              ? "badge-success"
              : row.status === "SUSPENDED"
              ? "badge-danger"
              : "badge-warning"
          }
        >
          {row.status}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout title="Tenant Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Tenants</h1>
            <p className="text-sm text-text-muted mt-1">
              Manage all tenants on the platform
            </p>
          </div>
          <button
            onClick={() => {
              setFormData({ name: "", email: "", phone: "", planId: "" });
              setFormError("");
              setModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Tenant
          </button>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="card flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={tenants}
            searchPlaceholder="Search tenants..."
            emptyMessage="No tenants found"
            actions={(row: Tenant) => (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleStatus(row)}
                  className="p-2 rounded-lg hover:bg-bg-main dark:hover:bg-[#111C2E] transition-colors"
                  title={row.status === "ACTIVE" ? "Disable" : "Enable"}
                >
                  {row.status === "ACTIVE" ? (
                    <ToggleRight size={18} className="text-success" />
                  ) : (
                    <ToggleLeft size={18} className="text-text-muted" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(row)}
                  className="p-2 rounded-lg hover:bg-bg-main dark:hover:bg-[#111C2E] transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} className="text-danger" />
                </button>
              </div>
            )}
          />
        )}
      </div>

      {/* Add Tenant Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Tenant"
      >
        <form onSubmit={handleAddTenant} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="label">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="input"
              placeholder="Enter tenant name"
              required
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="input"
              placeholder="Enter email address"
              required
            />
          </div>

          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="input"
              placeholder="Enter phone number"
            />
          </div>

          <div>
            <label className="label">Subscription Plan</label>
            <select
              value={formData.planId}
              onChange={(e) =>
                setFormData({ ...formData, planId: e.target.value })
              }
              className="select"
            >
              <option value="">No Plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
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
                  Creating...
                </span>
              ) : (
                "Add Tenant"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={confirmAction.onConfirm}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmText={confirmAction.confirmText}
          confirmVariant={confirmAction.variant}
          loading={actionLoading}
        />
      )}
    </DashboardLayout>
  );
}
