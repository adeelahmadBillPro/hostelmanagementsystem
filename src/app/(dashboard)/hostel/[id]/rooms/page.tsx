"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/ui/stat-card";
import Modal from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";
import {
  DoorOpen,
  BedDouble,
  Users,
  TrendingUp,
  Percent,
  DollarSign,
  Plus,
  Filter,
  Building2,
  Layers,
} from "lucide-react";

interface BedData {
  id: string;
  bedNumber: string;
  status: "VACANT" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
}

interface RoomData {
  id: string;
  roomNumber: string;
  type: string;
  totalBeds: number;
  rentPerBed: number;
  rentPerRoom: number | null;
  status: string;
  floorId: string;
  floor: {
    id: string;
    floorNumber: number;
    name: string;
    buildingId: string;
    building: { id: string; name: string };
  };
  beds: BedData[];
  occupiedBeds: number;
  vacantBeds: number;
  occupancyStatus: "vacant" | "partial" | "full" | "maintenance";
}

interface Stats {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyRate: number;
  revenuePotential: number;
}

interface BuildingOption {
  id: string;
  name: string;
}

interface FloorOption {
  id: string;
  name: string;
  floorNumber: number;
  buildingId: string;
}

// Status config for room cards
const STATUS_CONFIG = {
  EMPTY: {
    label: "EMPTY",
    border: "border-emerald-400 dark:border-emerald-500/50",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
    progress: "bg-emerald-500",
    numberColor: "text-emerald-600 dark:text-emerald-400",
  },
  FULL: {
    label: "FULL",
    border: "border-red-400 dark:border-red-500/50",
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
    progress: "bg-red-500",
    numberColor: "text-red-600 dark:text-red-400",
  },
  PARTIAL: {
    label: "PARTIAL",
    border: "border-amber-400 dark:border-amber-500/50",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
    progress: "bg-amber-500",
    numberColor: "text-amber-600 dark:text-amber-400",
  },
  MAINTENANCE: {
    label: "MAINTENANCE",
    border: "border-purple-400 dark:border-purple-500/50",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-700 dark:text-purple-400",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400",
    progress: "bg-purple-500",
    numberColor: "text-purple-600 dark:text-purple-400",
  },
};

function getRoomStatus(room: RoomData) {
  if (room.status === "MAINTENANCE") return STATUS_CONFIG.MAINTENANCE;
  const occupied = room.beds.filter((b) => b.status === "OCCUPIED").length;
  const total = room.beds.length;
  if (occupied === 0) return STATUS_CONFIG.EMPTY;
  if (occupied >= total) return STATUS_CONFIG.FULL;
  return STATUS_CONFIG.PARTIAL;
}

function getRoomStatusLabel(room: RoomData) {
  if (room.status === "MAINTENANCE") return "MAINTENANCE";
  const occupied = room.beds.filter((b) => b.status === "OCCUPIED").length;
  const total = room.beds.length;
  if (occupied === 0) return "EMPTY";
  if (occupied >= total) return "FULL";
  return "PARTIAL";
}

function getBedIconColor(status: string) {
  switch (status) {
    case "OCCUPIED":
      return "bg-red-500";
    case "VACANT":
      return "bg-gray-300 dark:bg-gray-600";
    case "RESERVED":
      return "bg-blue-500";
    case "MAINTENANCE":
      return "bg-purple-400";
    default:
      return "bg-gray-300 dark:bg-gray-600";
  }
}

// Group rooms by "Building — Floor"
interface RoomGroup {
  key: string;
  buildingName: string;
  floorName: string;
  floorNumber: number;
  rooms: RoomData[];
}

export default function RoomsPage() {
  const params = useParams();
  const router = useRouter();
  const hostelId = params.id as string;

  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [allFloors, setAllFloors] = useState<FloorOption[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalRooms: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    vacantBeds: 0,
    occupancyRate: 0,
    revenuePotential: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterBuilding, setFilterBuilding] = useState("");
  const [filterFloor, setFilterFloor] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    buildingId: "",
    floorId: "",
    roomNumber: "",
    type: "SINGLE",
    totalBeds: "1",
    rentPerBed: "",
    rentPerRoom: "",
  });

  const fetchRooms = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filterBuilding) queryParams.set("buildingId", filterBuilding);
      if (filterFloor) queryParams.set("floorId", filterFloor);
      if (filterType) queryParams.set("type", filterType);
      if (filterStatus) queryParams.set("status", filterStatus);

      const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
      const res = await fetch(`/api/hostels/${hostelId}/rooms${query}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRooms(data.rooms);
      setBuildings(data.buildings);
      setAllFloors(data.floors);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  }, [hostelId, filterBuilding, filterFloor, filterType, filterStatus]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Group rooms by building + floor
  const groupedRooms = useMemo<RoomGroup[]>(() => {
    const map = new Map<string, RoomGroup>();
    for (const room of rooms) {
      const bName = room.floor.building.name;
      const fName = room.floor.name;
      const fNum = room.floor.floorNumber;
      const key = `${bName}---${fName}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          buildingName: bName,
          floorName: fName,
          floorNumber: fNum,
          rooms: [],
        });
      }
      map.get(key)!.rooms.push(room);
    }
    // Sort groups by building name then floor number
    const groups = Array.from(map.values());
    groups.sort((a, b) => {
      if (a.buildingName !== b.buildingName)
        return a.buildingName.localeCompare(b.buildingName);
      return a.floorNumber - b.floorNumber;
    });
    // Sort rooms within each group by room number
    for (const g of groups) {
      g.rooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
    }
    return groups;
  }, [rooms]);

  // Filter floors by selected building
  const filteredFloors = filterBuilding
    ? allFloors.filter((f) => f.buildingId === filterBuilding)
    : allFloors;

  // Form floors filtered by form's selected building
  const formFloors = formData.buildingId
    ? allFloors.filter((f) => f.buildingId === formData.buildingId)
    : [];

  const handleAdd = async () => {
    if (
      !formData.floorId ||
      !formData.roomNumber ||
      !formData.type ||
      !formData.totalBeds ||
      !formData.rentPerBed
    )
      return;

    setSaving(true);
    try {
      const res = await fetch(`/api/hostels/${hostelId}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          floorId: formData.floorId,
          roomNumber: formData.roomNumber,
          type: formData.type,
          totalBeds: formData.totalBeds,
          rentPerBed: formData.rentPerBed,
          rentPerRoom: formData.rentPerRoom || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to create room");
        return;
      }
      setShowAddModal(false);
      setFormData({
        buildingId: "",
        floorId: "",
        roomNumber: "",
        type: "SINGLE",
        totalBeds: "1",
        rentPerBed: "",
        rentPerRoom: "",
      });
      fetchRooms();
    } catch (error) {
      console.error("Error creating room:", error);
    } finally {
      setSaving(false);
    }
  };

  // Auto-set totalBeds based on room type
  const handleTypeChange = (type: string) => {
    const bedMap: Record<string, string> = {
      SINGLE: "1",
      DOUBLE: "2",
      TRIPLE: "3",
      QUAD: "4",
    };
    setFormData({
      ...formData,
      type,
      totalBeds: bedMap[type] || formData.totalBeds,
    });
  };

  return (
    <DashboardLayout title="Room Management" hostelId={hostelId}>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          label="Total Rooms"
          value={stats.totalRooms}
          icon={DoorOpen}
          iconBg="#EEF2FF"
          iconColor="#4F46E5"
          delay={0}
        />
        <StatCard
          label="Total Beds"
          value={stats.totalBeds}
          icon={BedDouble}
          iconBg="#EFF6FF"
          iconColor="#3B82F6"
          delay={50}
        />
        <StatCard
          label="Occupied"
          value={stats.occupiedBeds}
          icon={Users}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          delay={100}
        />
        <StatCard
          label="Vacant"
          value={stats.vacantBeds}
          icon={TrendingUp}
          iconBg="#F0FDF4"
          iconColor="#10B981"
          delay={150}
        />
        <StatCard
          label="Occupancy"
          value={`${stats.occupancyRate}%`}
          icon={Percent}
          iconBg="#FFF7ED"
          iconColor="#F59E0B"
          delay={200}
        />
        <StatCard
          label="Revenue Potential"
          value={formatCurrency(stats.revenuePotential)}
          icon={DollarSign}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          delay={250}
        />
      </div>

      {/* Filter Bar */}
      <div className="card mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
          <div className="flex items-center gap-2 text-text-muted">
            <Filter size={16} />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <select
              className="select min-w-[160px]"
              value={filterBuilding}
              onChange={(e) => {
                setFilterBuilding(e.target.value);
                setFilterFloor("");
              }}
            >
              <option value="">All Buildings</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              className="select min-w-[160px]"
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
            >
              <option value="">All Floors</option>
              {filteredFloors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} (Floor {f.floorNumber})
                </option>
              ))}
            </select>
            <select
              className="select min-w-[130px]"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="SINGLE">Single</option>
              <option value="DOUBLE">Double</option>
              <option value="TRIPLE">Triple</option>
              <option value="QUAD">Quad</option>
            </select>
            <select
              className="select min-w-[130px]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <button
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
            onClick={() => {
              setFormData({
                buildingId: "",
                floorId: "",
                roomNumber: "",
                type: "SINGLE",
                totalBeds: "1",
                rentPerBed: "",
                rentPerRoom: "",
              });
              setShowAddModal(true);
            }}
          >
            <Plus size={16} />
            Add Room
          </button>
        </div>
      </div>

      {/* Color Legend */}
      <div className="card mb-6 !py-3 !px-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
            Room Status:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" />
            <span className="text-xs text-text-secondary dark:text-gray-400">Empty</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/40" />
            <span className="text-xs text-text-secondary dark:text-gray-400">Partial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border-2 border-red-500 bg-red-50 dark:bg-red-950/40" />
            <span className="text-xs text-text-secondary dark:text-gray-400">Full</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border-2 border-purple-500 bg-purple-50 dark:bg-purple-950/40" />
            <span className="text-xs text-text-secondary dark:text-gray-400">Maintenance</span>
          </div>

          <span className="w-px h-4 bg-border dark:bg-[#1E2D42]" />

          <span className="text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
            Bed Status:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs text-text-secondary dark:text-gray-400">Occupied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span className="text-xs text-text-secondary dark:text-gray-400">Vacant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs text-text-secondary dark:text-gray-400">Reserved</span>
          </div>
        </div>
      </div>

      {/* Room Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="card text-center py-12">
          <DoorOpen size={48} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-secondary mb-1">No rooms found</p>
          <p className="text-sm text-text-muted">
            {filterBuilding || filterFloor || filterType || filterStatus
              ? "No rooms match your filters. Try adjusting the filter criteria."
              : "Add buildings and floors first, then create rooms."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedRooms.map((group, groupIndex) => (
            <div
              key={group.key}
              className="opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${groupIndex * 80}ms` }}
            >
              {/* Section Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border border-primary/20">
                  <Building2 size={16} className="text-primary" />
                  <span className="text-sm font-bold text-primary uppercase tracking-wide">
                    {group.buildingName}
                  </span>
                  <span className="text-primary/50 mx-1">--</span>
                  <Layers size={14} className="text-primary" />
                  <span className="text-sm font-bold text-primary uppercase tracking-wide">
                    {group.floorName}
                  </span>
                </div>
                <div className="flex-1 h-px bg-border dark:bg-[#1E2D42]" />
                <span className="text-xs text-text-muted bg-bg-card dark:bg-[#111C2E] px-2 py-1 rounded-md border border-border dark:border-[#1E2D42]">
                  {group.rooms.length} {group.rooms.length === 1 ? "room" : "rooms"}
                </span>
              </div>

              {/* Room Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {group.rooms.map((room, roomIndex) => {
                  const statusConfig = getRoomStatus(room);
                  const statusLabel = getRoomStatusLabel(room);
                  const occupiedCount = room.beds.filter(
                    (b) => b.status === "OCCUPIED"
                  ).length;
                  const totalBedCount = room.beds.length;
                  const occupancyPercent =
                    totalBedCount > 0
                      ? Math.round((occupiedCount / totalBedCount) * 100)
                      : 0;

                  return (
                    <div
                      key={room.id}
                      className={`
                        relative rounded-xl border-2 p-4 cursor-pointer
                        transition-all duration-200 hover:scale-[1.03] hover:shadow-xl
                        ${statusConfig.border} ${statusConfig.bg}
                        dark:bg-[#111C2E] dark:hover:bg-[#162033]
                        opacity-0 animate-fade-in-up
                      `}
                      style={{
                        animationDelay: `${groupIndex * 80 + roomIndex * 40}ms`,
                      }}
                      onClick={() =>
                        router.push(`/hostel/${hostelId}/rooms/${room.id}`)
                      }
                    >
                      {/* Header: Room Number + Status Badge */}
                      <div className="flex items-start justify-between mb-1">
                        <h3
                          className={`text-2xl font-extrabold leading-tight ${statusConfig.numberColor}`}
                        >
                          {room.roomNumber}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${statusConfig.badge}`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      {/* Subtitle: Block + Floor */}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                        {room.floor.building.name} &middot; {room.floor.name}
                      </p>

                      {/* Bed Count + Percentage */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-text-primary dark:text-gray-200">
                          {occupiedCount}/{totalBedCount} Beds
                        </span>
                        <span
                          className={`text-sm font-bold ${statusConfig.text}`}
                        >
                          {occupancyPercent}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 mb-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${statusConfig.progress}`}
                          style={{ width: `${occupancyPercent}%` }}
                        />
                      </div>

                      {/* Bed Icons */}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {room.beds.map((bed) => {
                          const bedColor = bed.status === "OCCUPIED"
                            ? "text-red-500 bg-red-50 dark:bg-red-900/20"
                            : bed.status === "RESERVED"
                            ? "text-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : bed.status === "MAINTENANCE"
                            ? "text-purple-500 bg-purple-50 dark:bg-purple-900/20"
                            : "text-gray-400 bg-gray-100 dark:bg-gray-800/50";
                          return (
                            <span
                              key={bed.id}
                              className={`w-8 h-7 rounded-md flex items-center justify-center ${bedColor} transition-colors`}
                              title={`${bed.bedNumber}: ${bed.status}`}
                            >
                              <BedDouble size={16} />
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Room Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Room"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Building</label>
              <select
                className="select"
                value={formData.buildingId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    buildingId: e.target.value,
                    floorId: "",
                  })
                }
              >
                <option value="">Select Building</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Floor</label>
              <select
                className="select"
                value={formData.floorId}
                onChange={(e) =>
                  setFormData({ ...formData, floorId: e.target.value })
                }
                disabled={!formData.buildingId}
              >
                <option value="">Select Floor</option>
                {formFloors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} (Floor {f.floorNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Room Number</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., 101"
                value={formData.roomNumber}
                onChange={(e) =>
                  setFormData({ ...formData, roomNumber: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Room Type</label>
              <select
                className="select"
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="SINGLE">Single</option>
                <option value="DOUBLE">Double</option>
                <option value="TRIPLE">Triple</option>
                <option value="QUAD">Quad</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Total Beds</label>
              <input
                type="number"
                className="input"
                min="1"
                max="10"
                value={formData.totalBeds}
                onChange={(e) =>
                  setFormData({ ...formData, totalBeds: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Rent per Bed (PKR)</label>
              <input
                type="number"
                className="input"
                placeholder="e.g., 8000"
                min="0"
                value={formData.rentPerBed}
                onChange={(e) =>
                  setFormData({ ...formData, rentPerBed: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Rent per Room (PKR)</label>
              <input
                type="number"
                className="input"
                placeholder="Optional"
                min="0"
                value={formData.rentPerRoom}
                onChange={(e) =>
                  setFormData({ ...formData, rentPerRoom: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              className="btn-secondary"
              onClick={() => setShowAddModal(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleAdd}
              disabled={
                saving ||
                !formData.floorId ||
                !formData.roomNumber ||
                !formData.rentPerBed
              }
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                "Create Room"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
