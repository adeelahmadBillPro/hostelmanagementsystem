"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import DataTable from "@/components/ui/data-table";
import Modal from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Plus, Edit2, Trash2, Building2, Copy, Check, KeyRound } from "lucide-react";

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
  const [managers, setManagers] = useState<Manager[]>([]);
  const [hostels, setHostels] = useState<HostelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingManager, setDeletingManager] = useState<Manager | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState("");
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
        if (!formData.password) {
          setFormError("Password is required for new managers");
          return;
        }

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

        // Show credentials if returned
        if (data.loginCredentials) {
          setCreatedCreds(data.loginCredentials);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Managers</h1>
            <p className="text-sm text-text-muted mt-1">
              Manage hostel managers and their assignments
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Manager
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
            data={managers}
            searchPlaceholder="Search managers..."
            emptyMessage="No managers found"
            actions={(row: Manager) => (
              <div className="flex items-center gap-1">
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
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="label">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="input"
                placeholder="Enter password"
                required
                minLength={6}
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
                <button onClick={() => { navigator.clipboard.writeText(createdCreds.email); setCopied("email"); setTimeout(() => setCopied(""), 2000); }} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800">
                  {copied === "email" ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} className="text-text-muted" />}
                </button>
              </div>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-[#0B1222] rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Password</p>
                  <p className="text-sm font-mono font-bold text-primary">{createdCreds.password}</p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(createdCreds.password); setCopied("pass"); setTimeout(() => setCopied(""), 2000); }} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800">
                  {copied === "pass" ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} className="text-text-muted" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  const msg = encodeURIComponent(`Your HostelHub manager account is ready.\n\nLogin: ${window.location.origin}/login\nEmail: ${createdCreds.email}\nPassword: ${createdCreds.password}\n\nPlease change your password after login.`);
                  window.open(`https://wa.me/?text=${msg}`, "_blank");
                }}
                className="btn-success flex-1"
              >WhatsApp</button>
              <button onClick={() => { navigator.clipboard.writeText(`Email: ${createdCreds.email}\nPassword: ${createdCreds.password}`); setCopied("all"); setTimeout(() => setCopied(""), 2000); }} className="btn-secondary flex-1">
                {copied === "all" ? "Copied!" : "Copy All"}
              </button>
              <button onClick={() => setCreatedCreds(null)} className="btn-primary flex-1">Done</button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
