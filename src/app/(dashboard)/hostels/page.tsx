"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Modal from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import {
  Plus,
  Edit2,
  Trash2,
  Building2,
  MapPin,
  BedDouble,
  ArrowRight,
} from "lucide-react";

interface Hostel {
  id: string;
  name: string;
  type: "GOVERNMENT" | "UNIVERSITY" | "PRIVATE";
  address: string;
  city: string | null;
  contact: string | null;
  status: string;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  activeResidents: number;
  monthlyRevenue: number;
}

const HOSTEL_TYPES = ["GOVERNMENT", "UNIVERSITY", "PRIVATE"] as const;

export default function HostelsPage() {
  const router = useRouter();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHostel, setEditingHostel] = useState<Hostel | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingHostel, setDeletingHostel] = useState<Hostel | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    type: "PRIVATE" as string,
    address: "",
    city: "",
    contact: "",
  });

  const fetchHostels = async () => {
    try {
      const res = await fetch("/api/hostels");
      if (res.ok) {
        const data = await res.json();
        setHostels(data);
      }
    } catch (error) {
      console.error("Failed to fetch hostels:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  const resetForm = () => {
    setFormData({ name: "", type: "PRIVATE", address: "", city: "", contact: "" });
    setFormError("");
    setEditingHostel(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (hostel: Hostel) => {
    setEditingHostel(hostel);
    setFormData({
      name: hostel.name,
      type: hostel.type,
      address: hostel.address,
      city: hostel.city || "",
      contact: hostel.contact || "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setActionLoading(true);

    try {
      const url = editingHostel
        ? `/api/hostels/${editingHostel.id}`
        : "/api/hostels";
      const method = editingHostel ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          address: formData.address,
          city: formData.city || null,
          contact: formData.contact || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Failed to save hostel");
        return;
      }

      setModalOpen(false);
      resetForm();
      fetchHostels();
    } catch (error) {
      setFormError("An error occurred. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (hostel: Hostel) => {
    setDeletingHostel(hostel);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingHostel) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/hostels/${deletingHostel.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchHostels();
      }
    } catch (error) {
      console.error("Failed to delete hostel:", error);
    } finally {
      setActionLoading(false);
      setConfirmOpen(false);
      setDeletingHostel(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
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

  const getCardBorderColor = (type: string) => {
    switch (type) {
      case "PRIVATE":
        return "border-l-4 border-l-primary";
      case "UNIVERSITY":
        return "border-l-4 border-l-warning";
      case "GOVERNMENT":
        return "border-l-4 border-l-success";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Hostels">
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Hostels">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Hostels</h1>
            <p className="text-sm text-text-muted mt-1">
              Manage your hostel properties
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Hostel
          </button>
        </div>

        {/* Hostel Grid */}
        {hostels.length === 0 ? (
          <div className="card text-center py-12">
            <Building2 size={48} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-muted text-sm">
              No hostels found. Add your first hostel to get started.
            </p>
            <button
              onClick={openAddModal}
              className="btn-primary mt-4 inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Add Hostel
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {hostels.map((hostel, index) => (
              <div
                key={hostel.id}
                className={`card ${getCardBorderColor(hostel.type)} opacity-0 animate-fade-in-up`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() =>
                      router.push(`/hostel/${hostel.id}/buildings`)
                    }
                  >
                    <h3 className="font-semibold text-text-primary dark:text-white truncate">
                      {hostel.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
                      <MapPin size={12} />
                      <span className="truncate">
                        {hostel.address}
                        {hostel.city ? `, ${hostel.city}` : ""}
                      </span>
                    </div>
                  </div>
                  <span className={getTypeBadgeClass(hostel.type)}>
                    {hostel.type}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center p-2 rounded-lg bg-bg-main dark:bg-[#0B1222]">
                    <p className="text-lg font-bold text-text-primary dark:text-white">
                      {hostel.totalRooms}
                    </p>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">
                      Rooms
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-bg-main dark:bg-[#0B1222]">
                    <p className="text-lg font-bold text-success">
                      {hostel.occupiedBeds}
                    </p>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">
                      Occupied
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-bg-main dark:bg-[#0B1222]">
                    <p className="text-lg font-bold text-warning">
                      {hostel.vacantBeds}
                    </p>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">
                      Vacant
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border dark:border-[#1E2D42]">
                  <div>
                    <p className="text-xs text-text-muted">Monthly Revenue</p>
                    <p className="text-sm font-semibold text-text-primary dark:text-white">
                      {formatCurrency(hostel.monthlyRevenue)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(hostel);
                      }}
                      className="p-2 rounded-lg hover:bg-bg-main dark:hover:bg-[#111C2E] transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} className="text-text-muted" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(hostel);
                      }}
                      className="p-2 rounded-lg hover:bg-bg-main dark:hover:bg-[#111C2E] transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-danger" />
                    </button>
                    <button
                      onClick={() =>
                        router.push(`/hostel/${hostel.id}/buildings`)
                      }
                      className="p-2 rounded-lg hover:bg-bg-main dark:hover:bg-[#111C2E] transition-colors"
                      title="View Details"
                    >
                      <ArrowRight size={16} className="text-primary" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Hostel Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editingHostel ? "Edit Hostel" : "Add New Hostel"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="label">Hostel Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="input"
              placeholder="Enter hostel name"
              required
            />
          </div>

          <div>
            <label className="label">Hostel Type</label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              className="select"
              required
            >
              {HOSTEL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="input"
              placeholder="Enter hostel address"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="input"
                placeholder="Enter city"
              />
            </div>
            <div>
              <label className="label">Contact</label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) =>
                  setFormData({ ...formData, contact: e.target.value })
                }
                className="input"
                placeholder="Enter contact number"
              />
            </div>
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
                  {editingHostel ? "Updating..." : "Creating..."}
                </span>
              ) : editingHostel ? (
                "Update Hostel"
              ) : (
                "Add Hostel"
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
          setDeletingHostel(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Hostel"
        message={`Are you sure you want to permanently delete "${deletingHostel?.name}"? This action cannot be undone and will remove all associated buildings, rooms, residents, and billing records.`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={actionLoading}
      />
    </DashboardLayout>
  );
}
