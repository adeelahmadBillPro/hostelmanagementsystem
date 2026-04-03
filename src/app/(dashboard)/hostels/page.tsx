"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Modal from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { formatCurrency } from "@/lib/utils";
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
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "TENANT_ADMIN" || session?.user?.role === "SUPER_ADMIN";
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
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const ALL_AMENITIES = [
    { name: "WiFi", category: "hostel" },
    { name: "AC", category: "room" },
    { name: "Parking", category: "hostel" },
    { name: "Laundry", category: "hostel" },
    { name: "CCTV", category: "security" },
    { name: "Generator", category: "hostel" },
    { name: "RO Water", category: "hostel" },
    { name: "Geyser", category: "room" },
    { name: "Kitchen", category: "dining" },
    { name: "Mess/Canteen", category: "dining" },
    { name: "TV Lounge", category: "hostel" },
    { name: "Study Room", category: "hostel" },
    { name: "Gym", category: "hostel" },
    { name: "Sports Area", category: "hostel" },
    { name: "Prayer Room", category: "hostel" },
  ];

  const TYPE_DEFAULTS: Record<string, string[]> = {
    GOVERNMENT: ["WiFi", "Parking", "Mess/Canteen", "Prayer Room"],
    UNIVERSITY: ["WiFi", "AC", "Parking", "Laundry", "CCTV", "Mess/Canteen", "Study Room", "Prayer Room"],
    PRIVATE: ["WiFi", "AC", "Parking", "Laundry", "CCTV", "Generator", "RO Water", "Geyser", "Mess/Canteen", "TV Lounge"],
  };

  const handleTypeChange = (type: string) => {
    setFormData((f) => ({ ...f, type }));
    setSelectedAmenities(TYPE_DEFAULTS[type] || []);
  };

  const toggleAmenity = (name: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

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

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save hostel");
        return;
      }

      // Save amenities for new hostel
      if (!editingHostel && data.id && selectedAmenities.length > 0) {
        try {
          await fetch(`/api/hostels/${data.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amenities: selectedAmenities }),
          });
        } catch {}
      }

      setModalOpen(false);
      resetForm();
      setSelectedAmenities([]);
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

  // Using shared formatCurrency from imports

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
                className={`card ${getCardBorderColor(hostel.type)} opacity-0 animate-fade-in-up hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-text-primary dark:text-white truncate">
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
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className={`${getTypeBadgeClass(hostel.type)} text-[10px]`}>
                      {hostel.type}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(hostel); }}
                      className="p-1.5 rounded-lg hover:bg-bg-main dark:hover:bg-[#111C2E] transition-colors"
                      title="Edit Hostel"
                    >
                      <Edit2 size={14} className="text-text-muted" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(hostel); }}
                        className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors"
                        title="Delete Hostel"
                      >
                        <Trash2 size={14} className="text-danger" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2.5 rounded-xl bg-bg-main dark:bg-[#0B1222] border border-border/50 dark:border-[#1E2D42]">
                    <p className="text-xl font-bold text-text-primary dark:text-white">
                      {hostel.totalRooms}
                    </p>
                    <p className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
                      Rooms
                    </p>
                  </div>
                  <div className="text-center p-2.5 rounded-xl bg-success/5 border border-success/20">
                    <p className="text-xl font-bold text-success">
                      {hostel.occupiedBeds}
                    </p>
                    <p className="text-[10px] text-success/70 uppercase tracking-wide mt-0.5">
                      Occupied
                    </p>
                  </div>
                  <div className="text-center p-2.5 rounded-xl bg-warning/5 border border-warning/20">
                    <p className="text-xl font-bold text-warning">
                      {hostel.vacantBeds}
                    </p>
                    <p className="text-[10px] text-warning/70 uppercase tracking-wide mt-0.5">
                      Vacant
                    </p>
                  </div>
                </div>

                {/* Revenue + Manage Button */}
                <div className="flex items-center justify-between pt-3 border-t border-border dark:border-[#1E2D42]">
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wide">Monthly Revenue</p>
                    <p className="text-sm font-bold text-text-primary dark:text-white mt-0.5">
                      {formatCurrency(hostel.monthlyRevenue)}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {hostel.activeResidents} active residents
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/hostel/${hostel.id}/buildings`)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
                  >
                    Manage
                    <ArrowRight size={15} />
                  </button>
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
              onChange={(e) => handleTypeChange(e.target.value)}
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
              <label className="label">Contact Number</label>
              <input
                type="tel"
                value={formData.contact}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 11);
                  setFormData({ ...formData, contact: v });
                }}
                className="input"
                placeholder="03XXXXXXXXX"
                maxLength={11}
              />
            </div>
          </div>

          {/* Facilities */}
          {!editingHostel && (
            <div>
              <label className="label">Facilities & Amenities</label>
              <p className="text-[11px] text-text-muted mb-2">Auto-selected based on hostel type. Click to add/remove.</p>
              <div className="flex flex-wrap gap-2">
                {ALL_AMENITIES.map((amenity) => {
                  const selected = selectedAmenities.includes(amenity.name);
                  return (
                    <button
                      key={amenity.name}
                      type="button"
                      onClick={() => toggleAmenity(amenity.name)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        selected
                          ? "bg-primary/10 border-primary text-primary font-semibold"
                          : "bg-white dark:bg-[#111C2E] border-border dark:border-[#1E2D42] text-text-muted hover:border-primary/40"
                      }`}
                    >
                      {selected ? "✓ " : ""}{amenity.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
