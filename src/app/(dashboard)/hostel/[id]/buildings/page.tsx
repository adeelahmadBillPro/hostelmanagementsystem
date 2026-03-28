"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/ui/stat-card";
import Modal from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import {
  Building2,
  Layers,
  DoorOpen,
  BedDouble,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  Users,
  Percent,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/providers";

interface FloorData {
  id: string;
  floorNumber: number;
  name: string;
  buildingId: string;
  roomCount: number;
  bedCount: number;
  occupiedBeds: number;
}

interface BuildingData {
  id: string;
  name: string;
  totalFloors: number;
  hostelId: string;
  createdAt: string;
  floors: FloorData[];
  roomCount: number;
  bedCount: number;
  occupiedBeds: number;
}

interface Stats {
  totalBuildings: number;
  totalFloors: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  vacancyRate: number;
}

export default function BuildingsPage() {
  const params = useParams();
  const hostelId = params.id as string;
  const { addToast } = useToast();

  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalBuildings: 0,
    totalFloors: 0,
    totalRooms: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    vacancyRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingData | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", totalFloors: "" });

  const fetchBuildings = useCallback(async () => {
    try {
      const res = await fetch(`/api/hostels/${hostelId}/buildings`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBuildings(data.buildings);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching buildings:", error);
    } finally {
      setLoading(false);
    }
  }, [hostelId]);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  const toggleExpand = (buildingId: string) => {
    setExpandedBuildings((prev) => {
      const next = new Set(prev);
      if (next.has(buildingId)) {
        next.delete(buildingId);
      } else {
        next.add(buildingId);
      }
      return next;
    });
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.totalFloors) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/hostels/${hostelId}/buildings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        addToast(err.error || "Failed to create building", "error");
        return;
      }
      setShowAddModal(false);
      setFormData({ name: "", totalFloors: "" });
      fetchBuildings();
    } catch (error) {
      console.error("Error creating building:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedBuilding || !formData.name || !formData.totalFloors) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/hostels/${hostelId}/buildings/${selectedBuilding.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        addToast(err.error || "Failed to update building", "error");
        return;
      }
      setShowEditModal(false);
      setSelectedBuilding(null);
      setFormData({ name: "", totalFloors: "" });
      fetchBuildings();
    } catch (error) {
      console.error("Error updating building:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBuilding) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/hostels/${hostelId}/buildings/${selectedBuilding.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json();
        addToast(err.error || "Failed to delete building", "error");
        return;
      }
      setShowDeleteDialog(false);
      setSelectedBuilding(null);
      fetchBuildings();
    } catch (error) {
      console.error("Error deleting building:", error);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (building: BuildingData) => {
    setSelectedBuilding(building);
    setFormData({ name: building.name, totalFloors: String(building.totalFloors) });
    setShowEditModal(true);
  };

  const openDelete = (building: BuildingData) => {
    setSelectedBuilding(building);
    setShowDeleteDialog(true);
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return { bar: "#EF4444", text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" };
    if (rate >= 60) return { bar: "#F59E0B", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" };
    return { bar: "#10B981", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" };
  };

  return (
    <DashboardLayout title="Buildings & Infrastructure" hostelId={hostelId}>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Buildings" value={stats.totalBuildings} icon={Building2} iconBg="#EEF2FF" iconColor="#4F46E5" delay={0} />
        <StatCard label="Floors" value={stats.totalFloors} icon={Layers} iconBg="#F0FDF4" iconColor="#10B981" delay={50} />
        <StatCard label="Rooms" value={stats.totalRooms} icon={DoorOpen} iconBg="#FFF7ED" iconColor="#F59E0B" delay={100} />
        <StatCard label="Total Beds" value={stats.totalBeds} icon={BedDouble} iconBg="#EFF6FF" iconColor="#3B82F6" delay={150} />
        <StatCard label="Occupied" value={stats.occupiedBeds} icon={Users} iconBg="#FEF2F2" iconColor="#EF4444" delay={200} />
        <StatCard label="Vacancy Rate" value={`${stats.vacancyRate}%`} icon={Percent} iconBg="#ECFDF5" iconColor="#10B981" delay={250} />
      </div>

      {/* Header + Add Button */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="section-title">All Buildings</h2>
        <button className="btn-primary flex items-center gap-2" onClick={() => {
          setFormData({ name: "", totalFloors: "" });
          setShowAddModal(true);
        }}>
          <Plus size={16} />
          Add Building
        </button>
      </div>

      {/* Buildings List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : buildings.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mx-auto mb-4">
            <Building2 size={28} className="text-indigo-400" />
          </div>
          <p className="text-lg font-semibold text-text-primary dark:text-white mb-1">No buildings yet</p>
          <p className="text-sm text-text-muted mb-5 max-w-sm mx-auto">
            Add your first building to start managing floors, rooms, and beds.
          </p>
          <button className="btn-primary inline-flex items-center gap-2" onClick={() => {
            setFormData({ name: "", totalFloors: "" });
            setShowAddModal(true);
          }}>
            <Sparkles size={16} />
            Create First Building
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {buildings.map((building, idx) => {
            const isExpanded = expandedBuildings.has(building.id);
            const occupancyRate =
              building.bedCount > 0
                ? Math.round((building.occupiedBeds / building.bedCount) * 100)
                : 0;
            const occ = getOccupancyColor(occupancyRate);

            return (
              <div
                key={building.id}
                className="card p-0 overflow-hidden opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Building header */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  onClick={() => toggleExpand(building.id)}
                >
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-200/50 dark:ring-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <Building2 size={20} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-primary dark:text-white">
                      {building.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs font-medium text-text-muted bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {building.totalFloors} floors
                      </span>
                      <span className="text-xs font-medium text-text-muted bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {building.roomCount} rooms
                      </span>
                      <span className="text-xs font-medium text-text-muted bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {building.bedCount} beds
                      </span>
                    </div>
                  </div>

                  {/* Occupancy indicator */}
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="text-right">
                      <span className={`text-sm font-bold ${occ.text}`}>
                        {occupancyRate}%
                      </span>
                      <p className="text-[10px] text-text-muted">occupied</p>
                    </div>
                    <div className="w-24">
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${occupancyRate}%`, backgroundColor: occ.bar }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5">
                    <button
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={(e) => { e.stopPropagation(); openEdit(building); }}
                      title="Edit"
                    >
                      <Edit2 size={15} className="text-text-muted" />
                    </button>
                    <button
                      className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      onClick={(e) => { e.stopPropagation(); openDelete(building); }}
                      title="Delete"
                    >
                      <Trash2 size={15} className="text-red-400" />
                    </button>
                    <ChevronDown
                      size={16}
                      className={`text-text-muted transition-transform duration-200 ml-1 ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                    />
                  </div>
                </div>

                {/* Expanded floors */}
                {isExpanded && (
                  <div className="border-t border-border dark:border-[#1E2D42] bg-slate-50/50 dark:bg-[#0B1222]/50 animate-fade-in">
                    {building.floors.length === 0 ? (
                      <div className="p-6 text-center">
                        <Layers size={24} className="mx-auto mb-2 text-text-muted/40" />
                        <p className="text-sm text-text-muted">
                          No floors added yet. Go to Floors page to add floors.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50 dark:divide-[#1E2D42]/50">
                        {building.floors.map((floor) => {
                          const floorOccupancy =
                            floor.bedCount > 0
                              ? Math.round((floor.occupiedBeds / floor.bedCount) * 100)
                              : 0;
                          const fOcc = getOccupancyColor(floorOccupancy);
                          return (
                            <div
                              key={floor.id}
                              className="flex items-center gap-4 px-4 py-3 pl-14 hover:bg-white/50 dark:hover:bg-white/[0.01] transition-colors"
                            >
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                                <Layers size={14} className="text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary dark:text-white">
                                  {floor.name}
                                </p>
                                <p className="text-xs text-text-muted">
                                  Floor {floor.floorNumber}
                                </p>
                              </div>
                              <div className="hidden sm:flex items-center gap-3 text-xs text-text-muted">
                                <span>{floor.roomCount} rooms</span>
                                <span className="w-px h-3 bg-border dark:bg-[#1E2D42]" />
                                <span>{floor.bedCount} beds</span>
                                <span className="w-px h-3 bg-border dark:bg-[#1E2D42]" />
                                <span>{floor.occupiedBeds} occupied</span>
                              </div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${fOcc.text} ${fOcc.bg}`}>
                                {floorOccupancy}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Building Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Building">
        <div className="space-y-4">
          <div>
            <label className="label">Building Name *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Block A, Main Building"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Total Floors *</label>
            <input
              type="number"
              className="input"
              placeholder="e.g., 5"
              min="1"
              value={formData.totalFloors}
              onChange={(e) => setFormData({ ...formData, totalFloors: e.target.value })}
            />
            {formData.totalFloors && Number(formData.totalFloors) > 0 && (
              <p className="text-xs text-text-muted mt-1.5">
                Floors will be auto-named: Ground Floor, 1st Floor, 2nd Floor...
              </p>
            )}
          </div>

          {/* Quick preview */}
          {formData.name && formData.totalFloors && (
            <div className="p-3 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/15">
              <p className="text-xs font-semibold text-primary mb-1">Preview</p>
              <p className="text-sm text-text-secondary dark:text-slate-400">
                <strong>{formData.name}</strong> with {formData.totalFloors} floor{Number(formData.totalFloors) > 1 ? "s" : ""}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowAddModal(false)} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleAdd}
              disabled={saving || !formData.name || !formData.totalFloors}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                "Create Building"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Building Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Building">
        <div className="space-y-4">
          <div>
            <label className="label">Building Name</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Total Floors</label>
            <input
              type="number"
              className="input"
              min="1"
              value={formData.totalFloors}
              onChange={(e) => setFormData({ ...formData, totalFloors: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowEditModal(false)} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleEdit}
              disabled={saving || !formData.name || !formData.totalFloors}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Building"
        message={`Are you sure you want to delete "${selectedBuilding?.name}"? This will also delete all floors, rooms, and beds inside it. This action cannot be undone.`}
        confirmText="Delete Building"
        confirmVariant="danger"
        loading={saving}
      />
    </DashboardLayout>
  );
}
