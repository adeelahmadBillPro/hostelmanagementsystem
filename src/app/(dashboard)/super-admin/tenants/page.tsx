"use client";

import { useEffect, useState } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import DashboardLayout from "@/components/layout/dashboard-layout";
import DataTable from "@/components/ui/data-table";
import Modal from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Copy, Check, KeyRound } from "lucide-react";

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
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string; phone?: string } | null>(null);
  const [copied, setCopied] = useState("");

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

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create tenant");
        return;
      }

      setModalOpen(false);
      setFormData({ name: "", email: "", phone: "", planId: "" });
      fetchTenants();

      // Show credentials
      if (data.loginCredentials) {
        setCreatedCreds({ ...data.loginCredentials, phone: formData.phone || undefined });
      }
    } catch (error) {
      setFormError("An error occurred. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = (tenant: Tenant) => {
    const newStatus = tenant.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    setConfirmAction({
      title: newStatus === "INACTIVE" ? "⚠️ Disable Tenant Account" : "Enable Tenant Account",
      message: newStatus === "INACTIVE"
        ? `You are about to DISABLE "${tenant.name}" (${tenant.email}).\n\nWhat happens when disabled:\n• Tenant admin cannot login to the platform\n• All managers under this tenant cannot login\n• Residents and staff portals will stop working\n• No new bills can be generated\n• All data (hostels, residents, billing) is PRESERVED\n• Account can be re-enabled anytime\n\nThis is a safe, reversible action — no data is deleted.`
        : `Re-enable "${tenant.name}" (${tenant.email})?\n\nThis will restore full access:\n• Tenant admin can login again\n• All managers, residents & staff portals will work\n• Billing and all features restored\n• All previous data is intact`,
      confirmText: newStatus === "INACTIVE" ? "Yes, Disable Account" : "Yes, Enable Account",
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
      title: "⚠️ Delete Tenant — Permanent Action",
      message: `You are about to PERMANENTLY DELETE "${tenant.name}" (${tenant.email}).\n\nThis will destroy ALL data including:\n• All hostels owned by this tenant\n• All rooms, beds, buildings & floors\n• All residents and their portal accounts\n• All managers and staff accounts\n• All monthly bills, payments & receipts\n• All food orders and menu items\n• All complaints, gate passes & notices\n• All visitors, meter readings & expenses\n• All leave notices & checkout settlements\n• All conversations & messages\n• All audit logs\n\nThis action CANNOT be undone. Are you absolutely sure?`,
      confirmText: "Yes, Delete Everything",
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
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 11);
                setFormData({ ...formData, phone: v });
              }}
              className="input"
              placeholder="03XXXXXXXXX"
              maxLength={11}
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

      {/* Credentials Modal */}
      <Modal
        isOpen={!!createdCreds}
        onClose={() => setCreatedCreds(null)}
        title="Tenant Created Successfully"
        maxWidth="max-w-[440px]"
      >
        {createdCreds && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Share these login credentials with the tenant admin.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-[#0B1222] rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Email</p>
                  <p className="text-sm font-medium text-text-primary dark:text-white">{createdCreds.email}</p>
                </div>
                <button onClick={() => { copyToClipboard(createdCreds.email); setCopied("email"); setTimeout(() => setCopied(""), 2000); }} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                  {copied === "email" ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} className="text-text-muted" />}
                </button>
              </div>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-[#0B1222] rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Password</p>
                  <p className="text-sm font-mono font-bold text-primary">{createdCreds.password}</p>
                </div>
                <button onClick={() => { copyToClipboard(createdCreds.password); setCopied("pass"); setTimeout(() => setCopied(""), 2000); }} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                  {copied === "pass" ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} className="text-text-muted" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  const msg = encodeURIComponent(`Your HostelHub admin account is ready.\n\nLogin: ${window.location.origin}/login\nEmail: ${createdCreds.email}\nPassword: ${createdCreds.password}\n\nPlease change your password after login.`);
                  const phone = createdCreds.phone ? `92${createdCreds.phone.replace(/^0/, "")}` : "";
                  window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
                }}
                className="btn-success flex-1"
              >
                WhatsApp
              </button>
              <button
                onClick={() => { copyToClipboard(`HostelHub Login\nURL: ${window.location.origin}/login\nEmail: ${createdCreds.email}\nPassword: ${createdCreds.password}`); setCopied("all"); setTimeout(() => setCopied(""), 2000); }}
                className="btn-secondary flex-1"
              >
                {copied === "all" ? "Copied!" : "Copy All"}
              </button>
              <button onClick={() => setCreatedCreds(null)} className="btn-primary flex-1">
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
