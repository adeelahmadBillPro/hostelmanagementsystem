"use client";

import { useEffect, useState } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import DashboardLayout from "@/components/layout/dashboard-layout";
import DataTable from "@/components/ui/data-table";
import Modal from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Plus, Edit2, Trash2, Building2, Copy, Check, KeyRound, ShieldCheck, MessageSquare, Send, Users } from "lucide-react";
import { useToast } from "@/components/providers";

// ─── Permission definitions ────────────────────────────────────────────────
const PERMISSION_GROUPS = [
  {
    label: "Billing",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    perms: [
      { key: "billing_view", label: "View Bills" },
      { key: "billing_manage", label: "Generate / Edit Bills" },
      { key: "billing_payments", label: "Record Payments" },
    ],
  },
  {
    label: "Residents",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    perms: [
      { key: "residents_view", label: "View Residents" },
      { key: "residents_manage", label: "Add / Edit Residents" },
      { key: "residents_checkout", label: "Checkout Residents" },
    ],
  },
  {
    label: "Rooms",
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    perms: [
      { key: "rooms_view", label: "View Rooms" },
      { key: "rooms_manage", label: "Add / Edit Rooms" },
    ],
  },
  {
    label: "Food / Mess",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    perms: [
      { key: "food_view", label: "View Food Orders" },
      { key: "food_manage", label: "Manage Menu & Orders" },
    ],
  },
  {
    label: "Expenses",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    perms: [
      { key: "expenses_view", label: "View Expenses" },
      { key: "expenses_manage", label: "Add / Delete Expenses" },
    ],
  },
  {
    label: "Staff",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    perms: [
      { key: "staff_view", label: "View Staff" },
      { key: "staff_manage", label: "Add / Manage Staff" },
    ],
  },
  {
    label: "Other",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/20",
    perms: [
      { key: "reports_view", label: "Reports / P&L" },
      { key: "gate_passes_view", label: "View Gate Passes" },
      { key: "gate_passes_manage", label: "Manage Gate Passes" },
      { key: "complaints_view", label: "View Complaints" },
      { key: "complaints_manage", label: "Manage Complaints" },
      { key: "notices_view", label: "View Notices" },
      { key: "notices_manage", label: "Post Notices" },
      { key: "meter_readings_view", label: "View Meter Readings" },
      { key: "meter_readings_manage", label: "Add Meter Readings" },
      { key: "visitors_view", label: "View Visitors" },
      { key: "visitors_manage", label: "Manage Visitors" },
    ],
  },
];

const ALL_PERMS = PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => p.key));

interface AssignedHostel {
  id: string;
  name: string;
  type: "GOVERNMENT" | "UNIVERSITY" | "PRIVATE";
}

interface Manager {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  assignedHostels: AssignedHostel[];
}

interface HostelOption {
  id: string;
  name: string;
  type: string;
}

export default function ManagersPage() {
  const { addToast } = useToast();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [hostels, setHostels] = useState<HostelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingManager, setDeletingManager] = useState<Manager | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string; phone?: string } | null>(null);
  const [copied, setCopied] = useState("");

  // Message state
  const [msgTarget, setMsgTarget] = useState<Manager | "all" | null>(null);
  const [msgForm, setMsgForm] = useState({ subject: "", body: "" });
  const [msgSending, setMsgSending] = useState(false);

  // Permissions modal state
  const [permManager, setPermManager] = useState<Manager | null>(null);
  const [permHostelId, setPermHostelId] = useState<string>("");
  const [permChecked, setPermChecked] = useState<string[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [permHostelData, setPermHostelData] = useState<{ hostelId: string; hostelName: string; permissions: string[] }[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    salary: "",
    hostelIds: [] as string[],
  });

  const fetchManagers = async () => {
    try {
      const res = await fetch("/api/managers");
      if (res.ok) {
        const data = await res.json();
        setManagers(data);
      }
    } catch (error) {
      console.error("Failed to fetch managers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHostels = async () => {
    try {
      const res = await fetch("/api/hostels");
      if (res.ok) {
        const data = await res.json();
        setHostels(
          data.map((h: any) => ({ id: h.id, name: h.name, type: h.type }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch hostels:", error);
    }
  };

  useEffect(() => {
    fetchManagers();
    fetchHostels();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      salary: "",
      hostelIds: [],
    });
    setFormError("");
    setEditingManager(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (manager: Manager) => {
    setEditingManager(manager);
    setFormData({
      name: manager.name,
      email: manager.email,
      phone: manager.phone || "",
      password: "",
      salary: "",
      hostelIds: manager.assignedHostels.map((h) => h.id),
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleHostelToggle = (hostelId: string) => {
    setFormData((prev) => ({
      ...prev,
      hostelIds: prev.hostelIds.includes(hostelId)
        ? prev.hostelIds.filter((id) => id !== hostelId)
        : [...prev.hostelIds, hostelId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setActionLoading(true);

    // —— Front-end validation ————————————————————————————————————————————
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setFormError("Name must be at least 2 characters");
      setActionLoading(false);
      return;
    }
    if (!editingManager) {
      if (!formData.email.trim()) {
        setFormError("Email is required");
        setActionLoading(false);
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        setFormError("Please enter a valid email address");
        setActionLoading(false);
        return;
      }
    }
    if (formData.phone) {
      const cleanPhone = formData.phone.replace(/\D/g, "");
      if (cleanPhone.length > 0 && (cleanPhone.length !== 11 || !cleanPhone.startsWith("03"))) {
        setFormError("Phone must be 11 digits starting with 03 (e.g. 03001234567)");
        setActionLoading(false);
        return;
      }
    }
    if (!editingManager && formData.password && formData.password.length < 8) {
      setFormError("Password must be at least 8 characters");
      setActionLoading(false);
      return;
    }

    try {
      if (editingManager) {
        // Update manager
        const res = await fetch(`/api/managers/${editingManager.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone || null,
            hostelIds: formData.hostelIds,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || "Failed to update manager");
          return;
        }
      } else {
        // Create manager
        const res = await fetch("/api/managers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            password: formData.password,
            salary: parseFloat(formData.salary) || 0,
            hostelIds: formData.hostelIds,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error || "Failed to create manager");
          return;
        }

        // Show credentials modal — close form first to avoid overlap
        if (data.loginCredentials) {
          setModalOpen(false);
          resetForm();
          fetchManagers();
          setCreatedCreds({ ...data.loginCredentials, phone: formData.phone || undefined });
          return;
        }
      }

      setModalOpen(false);
      resetForm();
      fetchManagers();
    } catch (error) {
      setFormError("An error occurred. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (manager: Manager) => {
    setDeletingManager(manager);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingManager) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/managers/${deletingManager.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchManagers();
      }
    } catch (error) {
      console.error("Failed to delete manager:", error);
    } finally {
      setActionLoading(false);
      setConfirmOpen(false);
      setDeletingManager(null);
    }
  };

  const openPermissions = async (manager: Manager) => {
    setPermManager(manager);
    setPermLoading(true);
    setPermHostelData([]);
    setPermChecked([]);
    const res = await fetch(`/api/managers/${manager.id}/permissions`);
    if (res.ok) {
      const data = await res.json();
      setPermHostelData(data.assignments || []);
      if (data.assignments?.length > 0) {
        const first = data.assignments[0];
        setPermHostelId(first.hostelId);
        setPermChecked(first.permissions || []);
      }
    }
    setPermLoading(false);
  };

  const handlePermHostelChange = (hostelId: string) => {
    const found = permHostelData.find((h) => h.hostelId === hostelId);
    setPermHostelId(hostelId);
    setPermChecked(found?.permissions || []);
  };

  const handlePermToggle = (perm: string) => {
    setPermChecked((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handlePermGroupToggle = (keys: string[]) => {
    const allOn = keys.every((k) => permChecked.includes(k));
    if (allOn) {
      setPermChecked((prev) => prev.filter((p) => !keys.includes(p)));
    } else {
      setPermChecked((prev) => [...new Set([...prev, ...keys])]);
    }
  };

  const handlePermSelectAll = () => {
    setPermChecked(permChecked.length === ALL_PERMS.length ? [] : [...ALL_PERMS]);
  };

  const savePermissions = async () => {
    if (!permManager || !permHostelId) return;
    setPermSaving(true);
    const res = await fetch(`/api/managers/${permManager.id}/permissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostelId: permHostelId, permissions: permChecked }),
    });
    if (res.ok) {
      // Update local cache
      setPermHostelData((prev) =>
        prev.map((h) =>
          h.hostelId === permHostelId ? { ...h, permissions: permChecked } : h
        )
      );
    }
    setPermSaving(false);
  };

  const handleSendMessage = async () => {
    if (!msgForm.subject.trim() || !msgForm.body.trim()) {
      addToast("Subject and message body are required", "error");
      return;
    }
    setMsgSending(true);
    try {
      const payload: Record<string, unknown> = {
        subject: msgForm.subject,
        body: msgForm.body,
      };
      if (msgTarget === "all") {
        payload.targetAll = true;
      } else {
        payload.targetManagerId = (msgTarget as Manager).id;
      }
      const res = await fetch("/api/managers/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Failed to send message", "error");
      } else {
        addToast("Message sent successfully", "success");
        setMsgTarget(null);
        setMsgForm({ subject: "", body: "" });
      }
    } catch {
      addToast("Failed to send message", "error");
    } finally {
      setMsgSending(false);
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "PRIVATE":
        return "badge-primary";
      case "UNIVERSITY":
        return "badge-warning";
      case "GOVERNMENT":
        return "badge-success";
      default:
        return "badge-primary";
    }
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (row: Manager) => (
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
      key: "phone",
      label: "Phone",
      render: (row: Manager) => row.phone || "-",
    },
    {
      key: "assignedHostels",
      label: "Assigned Hostels",
      render: (row: Manager) =>
        row.assignedHostels.length === 0 ? (
          <span className="text-text-muted text-xs">No hostels assigned</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.assignedHostels.map((hostel) => (
              <span
                key={hostel.id}
                className={getTypeBadgeClass(hostel.type)}
              >
                {hostel.name}
              </span>
            ))}
          </div>
        ),
    },
  ];

  return (
    <DashboardLayout title="Managers">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Managers</h1>
            <p className="text-sm text-text-muted mt-1">
              Manage hostel managers and their assignments
            </p>
          </div>
          <div className="flex items-center gap-2">
            {managers.length > 0 && (
              <button
                onClick={() => { setMsgTarget("all"); setMsgForm({ subject: "", body: "" }); }}
                className="btn-secondary flex items-center gap-2"
                title="Send message to all managers"
              >
                <Users size={16} />
                <span className="hidden sm:inline">Message All</span>
              </button>
            )}
            <button
              onClick={openAddModal}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              Add Manager
            </button>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="card flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={managers}
            searchPlaceholder="Search managers..."
            emptyMessage="No managers found"
            actions={(row: Manager) => (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setMsgTarget(row); setMsgForm({ subject: "", body: "" }); }}
                  className="p-2 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                  title="Send Message"
                >
                  <MessageSquare size={18} className="text-teal-600 dark:text-teal-400" />
                </button>
                <button
                  onClick={() => openPermissions(row)}
                  className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
                  title="Manage Permissions"
                >
                  <ShieldCheck size={18} className="text-primary" />
                </button>
                <button
                  onClick={() => openEditModal(row)}
                  className="p-2 rounded-lg hover:bg-bg-main dark:hover:bg-[#111C2E] transition-colors"
                  title="Edit"
                >
                  <Edit2 size={18} className="text-text-muted" />
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

      {/* Add / Edit Manager Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editingManager ? "Edit Manager" : "Add New Manager"}
      >
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
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
              placeholder="Enter manager name"
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
              disabled={!!editingManager}
              autoComplete="off"
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

          {!editingManager && (
            <div>
              <label className="label">Password <span className="text-xs text-text-muted ml-1">(auto-generated if left blank)</span></label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="input"
                placeholder="Leave blank to auto-generate"
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          )}

          <div>
            <label className="label">Monthly Salary (PKR)</label>
            <input
              type="number"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              className="input"
              placeholder="e.g., 25000"
              min="0"
            />
            <p className="text-[10px] text-text-muted mt-1">Used for salary sheet generation</p>
          </div>

          <div>
            <label className="label">Assign Hostels</label>
            {hostels.length === 0 ? (
              <div className="p-4 rounded-lg bg-bg-main dark:bg-[#0B1222] text-sm text-text-muted flex items-center gap-2">
                <Building2 size={16} />
                No hostels available. Create a hostel first.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto p-3 rounded-lg border border-border dark:border-[#1E2D42] bg-bg-main dark:bg-[#0B1222]">
                {hostels.map((hostel) => (
                  <label
                    key={hostel.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-[#111C2E] cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.hostelIds.includes(hostel.id)}
                      onChange={() => handleHostelToggle(hostel.id)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm text-text-primary dark:text-white truncate">
                        {hostel.name}
                      </span>
                      <span
                        className={`text-[10px] ${getTypeBadgeClass(hostel.type)}`}
                      >
                        {hostel.type}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {formData.hostelIds.length > 0 && (
              <p className="text-xs text-text-muted mt-1">
                {formData.hostelIds.length} hostel
                {formData.hostelIds.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
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
                  {editingManager ? "Updating..." : "Creating..."}
                </span>
              ) : editingManager ? (
                "Update Manager"
              ) : (
                "Add Manager"
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
          setDeletingManager(null);
        }}
        onConfirm={confirmDelete}
        title="Remove Manager"
        message={`Are you sure you want to remove "${deletingManager?.name}"? This will revoke their access and remove all hostel assignments.`}
        confirmText="Remove"
        confirmVariant="danger"
        loading={actionLoading}
      />

      {/* Manager Credentials Modal */}
      <Modal isOpen={!!createdCreds} onClose={() => setCreatedCreds(null)} title="Manager Created" maxWidth="max-w-[440px]">
        {createdCreds && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">Share these login credentials with the manager.</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-[#0B1222] rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Email</p>
                  <p className="text-sm font-medium text-text-primary dark:text-white">{createdCreds.email}</p>
                </div>
                <button onClick={() => { copyToClipboard(createdCreds.email); setCopied("email"); setTimeout(() => setCopied(""), 2000); }} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800">
                  {copied === "email" ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} className="text-text-muted" />}
                </button>
              </div>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-[#0B1222] rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Password</p>
                  <p className="text-sm font-mono font-bold text-primary">{createdCreds.password}</p>
                </div>
                <button onClick={() => { copyToClipboard(createdCreds.password); setCopied("pass"); setTimeout(() => setCopied(""), 2000); }} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800">
                  {copied === "pass" ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} className="text-text-muted" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  const msg = encodeURIComponent(`Your HostelHub manager account is ready.\n\nLogin: ${window.location.origin}/login\nEmail: ${createdCreds.email}\nPassword: ${createdCreds.password}\n\nPlease change your password after login.`);
                  const phone = createdCreds.phone ? `92${createdCreds.phone.replace(/^0/, "")}` : "";
                  window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
                }}
                className="btn-success flex-1"
              >WhatsApp</button>
              <button onClick={() => { copyToClipboard(`HostelHub Login\nURL: ${window.location.origin}/login\nEmail: ${createdCreds.email}\nPassword: ${createdCreds.password}`); setCopied("all"); setTimeout(() => setCopied(""), 2000); }} className="btn-secondary flex-1">
                {copied === "all" ? "Copied!" : "Copy All"}
              </button>
              <button onClick={() => setCreatedCreds(null)} className="btn-primary flex-1">Done</button>
            </div>
          </div>
        )}
      </Modal>
      {/* Send Message Modal */}
      <Modal
        isOpen={!!msgTarget}
        onClose={() => setMsgTarget(null)}
        title={msgTarget === "all" ? "Message All Managers" : `Message — ${(msgTarget as Manager)?.name || ""}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {msgTarget === "all" ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-sm text-teal-700 dark:text-teal-300">
              <Users size={16} />
              This message will be sent to all {managers.length} manager{managers.length !== 1 ? "s" : ""}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#0B1222] text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {(msgTarget as Manager)?.name?.[0]}
              </div>
              <div>
                <p className="font-medium text-text-primary dark:text-white">{(msgTarget as Manager)?.name}</p>
                <p className="text-xs text-text-muted">{(msgTarget as Manager)?.email}</p>
              </div>
            </div>
          )}
          <div>
            <label className="label">Subject *</label>
            <input
              type="text"
              value={msgForm.subject}
              onChange={(e) => setMsgForm((p) => ({ ...p, subject: e.target.value }))}
              className="input"
              placeholder="e.g. Monthly target reminder"
            />
          </div>
          <div>
            <label className="label">Message *</label>
            <textarea
              value={msgForm.body}
              onChange={(e) => setMsgForm((p) => ({ ...p, body: e.target.value }))}
              className="textarea"
              rows={5}
              placeholder="Write your message here..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setMsgTarget(null)} className="btn-secondary">Cancel</button>
            <button
              onClick={handleSendMessage}
              disabled={msgSending}
              className="btn-primary flex items-center gap-2"
            >
              {msgSending ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
              ) : (
                <><Send size={15} /> Send Message</>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        isOpen={!!permManager}
        onClose={() => setPermManager(null)}
        title={`Permissions — ${permManager?.name || ""}`}
        maxWidth="max-w-2xl"
      >
        {permLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : permHostelData.length === 0 ? (
          <div className="text-center py-10 text-text-muted">
            <ShieldCheck size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">This manager has no hostels assigned.</p>
            <p className="text-xs mt-1">Assign hostels first, then set permissions.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Hostel selector */}
            {permHostelData.length > 1 && (
              <div>
                <label className="label">Select Hostel</label>
                <div className="flex flex-wrap gap-2">
                  {permHostelData.map((h) => (
                    <button
                      key={h.hostelId}
                      onClick={() => handlePermHostelChange(h.hostelId)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        permHostelId === h.hostelId
                          ? "bg-primary text-white border-primary"
                          : "bg-bg-main dark:bg-[#0B1222] text-text-secondary border-border dark:border-[#1E2D42] hover:border-primary"
                      }`}
                    >
                      {h.hostelName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Select all / none */}
            <div className="flex items-center justify-between pb-1 border-b border-border dark:border-[#1E2D42]">
              <p className="text-xs text-text-muted">
                {permChecked.length} / {ALL_PERMS.length} permissions enabled
              </p>
              <button
                onClick={handlePermSelectAll}
                className="text-xs font-medium text-primary hover:underline"
              >
                {permChecked.length === ALL_PERMS.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            {/* Permission groups */}
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {PERMISSION_GROUPS.map((group) => {
                const groupKeys = group.perms.map((p) => p.key);
                const allOn = groupKeys.every((k) => permChecked.includes(k));
                const someOn = groupKeys.some((k) => permChecked.includes(k));
                return (
                  <div key={group.label} className={`rounded-xl border border-border dark:border-[#1E2D42] overflow-hidden`}>
                    <button
                      onClick={() => handlePermGroupToggle(groupKeys)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 ${group.bg} transition-colors`}
                    >
                      <span className={`text-sm font-semibold ${group.color}`}>{group.label}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        allOn ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" :
                        someOn ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
                        "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      }`}>
                        {allOn ? "All on" : someOn ? "Partial" : "None"}
                      </span>
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border dark:divide-[#1E2D42]">
                      {group.perms.map((perm) => (
                        <label
                          key={perm.key}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-main dark:hover:bg-[#111C2E] cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={permChecked.includes(perm.key)}
                            onChange={() => handlePermToggle(perm.key)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-text-secondary dark:text-gray-300">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border dark:border-[#1E2D42]">
              <button onClick={() => setPermManager(null)} className="btn-secondary">
                Close
              </button>
              <button
                onClick={savePermissions}
                disabled={permSaving}
                className="btn-primary flex items-center gap-2"
              >
                {permSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Save Permissions
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
