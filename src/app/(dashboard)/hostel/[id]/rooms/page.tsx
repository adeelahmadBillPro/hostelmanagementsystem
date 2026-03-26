"use client";

import { useState, useEffect, useCallback } from "react";
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
  Search,
  Filter,
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

  const getOccupancyClass = (status: string) => {
    switch (status) {
      case "vacant":
        return "room-vacant";
      case "partial":
        return "room-partial";
      case "full":
        return "room-full";
      case "maintenance":
        return "room-reserved";
      default:
        return "room-vacant";
    }
  };

  const getBedDotColor = (status: string) => {
    switch (status) {
      case "OCCUPIED":
        return "bg-red-500";
      case "VACANT":
        return "bg-emerald-500";
      case "RESERVED":
        return "bg-indigo-500";
      case "MAINTENANCE":
        return "bg-gray-400";
      default:
        return "bg-gray-300";
    }
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

      {/* Room Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500" />
          <span>Vacant</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-500/20 border border-amber-500" />
          <span>Partial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500" />
          <span>Full</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-indigo-500/20 border border-indigo-500" />
          <span>Maintenance</span>
        </div>
        <div className="ml-4 flex items-center gap-3">
          <span className="font-medium">Bed dots:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Vacant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Reserved</span>
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`${getOccupancyClass(
                room.occupancyStatus
              )} rounded-xl p-3 cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-lg`}
              onClick={() =>
                router.push(`/hostel/${hostelId}/rooms/${room.id}`)
              }
            >
              {/* Room number */}
              <div className="flex items-start justify-between mb-1.5">
                <h3 className="text-lg font-bold leading-tight">
                  {room.roomNumber}
                </h3>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/40 dark:bg-black/20 uppercase">
                  {room.type}
                </span>
              </div>

              {/* Building / Floor info */}
              <p className="text-[11px] opacity-75 mb-2 truncate">
                {room.floor.building.name} - {room.floor.name}
              </p>

              {/* Beds count */}
              <p className="text-sm font-semibold mb-2">
                {room.occupiedBeds}/{room.beds.length} Beds
              </p>

              {/* Bed dots */}
              <div className="flex flex-wrap gap-1">
                {room.beds.map((bed) => (
                  <span
                    key={bed.id}
                    className={`w-2.5 h-2.5 rounded-full ${getBedDotColor(
                      bed.status
                    )} ring-1 ring-white/50`}
                    title={`${bed.bedNumber}: ${bed.status}`}
                  />
                ))}
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

          <div className="grid grid-cols-3 gap-4">
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
