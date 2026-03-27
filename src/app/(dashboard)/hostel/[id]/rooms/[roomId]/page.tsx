"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  BedDouble,
  DoorOpen,
  Building2,
  Layers,
  Edit2,
  Trash2,
  UserPlus,
  Eye,
  Package,
  History,
  User,
  Phone,
  Calendar,
  Wrench,
  ShieldCheck,
} from "lucide-react";

interface BedResident {
  id: string;
  name: string;
  phone: string | null;
  moveInDate: string;
}

interface BedData {
  id: string;
  bedNumber: string;
  status: "VACANT" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
  resident: BedResident | null;
}

interface RoomDetail {
  id: string;
  roomNumber: string;
  type: string;
  totalBeds: number;
  rentPerBed: number;
  rentPerRoom: number | null;
  status: string;
  floor: {
    id: string;
    floorNumber: number;
    name: string;
    buildingId: string;
    building: { id: string; name: string };
  };
  createdAt: string;
}

interface InventoryItem {
  id: string;
  itemName: string;
  quantity: number;
  condition: string | null;
  lastChecked: string | null;
}

interface PastResident {
  id: string;
  name: string;
  phone: string | null;
  bedNumber: string;
  moveInDate: string;
  moveOutDate: string | null;
  status: string;
}

export default function RoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const hostelId = params.id as string;
  const roomId = params.roomId as string;

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [beds, setBeds] = useState<BedData[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [activeResidents, setActiveResidents] = useState<any[]>([]);
  const [pastResidents, setPastResidents] = useState<PastResident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchRoomDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/hostels/${hostelId}/rooms/${roomId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRoom(data.room);
      setBeds(data.beds);
      setInventory(data.inventory);
      setActiveResidents(data.activeResidents);
      setPastResidents(data.pastResidents);
    } catch (error) {
      console.error("Error fetching room detail:", error);
    } finally {
      setLoading(false);
    }
  }, [hostelId, roomId]);

  useEffect(() => {
    fetchRoomDetail();
  }, [fetchRoomDetail]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/hostels/${hostelId}/rooms/${roomId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to delete room");
        setDeleting(false);
        return;
      }
      router.push(`/hostel/${hostelId}/rooms`);
    } catch (error) {
      console.error("Error deleting room:", error);
      setDeleting(false);
    }
  };

  const getBedCardStyle = (status: string) => {
    switch (status) {
      case "VACANT":
        return "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800";
      case "OCCUPIED":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "RESERVED":
        return "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800";
      case "MAINTENANCE":
        return "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getBedIcon = (status: string) => {
    switch (status) {
      case "VACANT":
        return <BedDouble size={24} className="text-emerald-600 dark:text-emerald-400" />;
      case "OCCUPIED":
        return <User size={24} className="text-red-600 dark:text-red-400" />;
      case "RESERVED":
        return <ShieldCheck size={24} className="text-indigo-600 dark:text-indigo-400" />;
      case "MAINTENANCE":
        return <Wrench size={24} className="text-gray-500 dark:text-gray-400" />;
      default:
        return <BedDouble size={24} className="text-gray-400" />;
    }
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case "VACANT":
        return "badge-success";
      case "OCCUPIED":
        return "badge-danger";
      case "RESERVED":
        return "badge-primary";
      case "MAINTENANCE":
        return "badge-warning";
      default:
        return "badge-primary";
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Room Detail" hostelId={hostelId}>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!room) {
    return (
      <DashboardLayout title="Room Detail" hostelId={hostelId}>
        <div className="card text-center py-12">
          <DoorOpen size={48} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-secondary">Room not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const occupiedCount = beds.filter((b) => b.status === "OCCUPIED").length;
  const vacantCount = beds.filter((b) => b.status === "VACANT").length;

  return (
    <DashboardLayout title={`Room ${room.roomNumber}`} hostelId={hostelId}>
      {/* Back button + actions */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push(`/hostel/${hostelId}/rooms`)}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Rooms
        </button>
        <div className="flex items-center gap-2">
          <button
            className="btn-danger flex items-center gap-2"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 size={14} />
            Delete Room
          </button>
        </div>
      </div>

      {/* Room Info Card */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <DoorOpen size={32} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary dark:text-white">
                Room {room.roomNumber}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
                <span className="flex items-center gap-1">
                  <Building2 size={14} />
                  {room.floor.building.name}
                </span>
                <span className="flex items-center gap-1">
                  <Layers size={14} />
                  {room.floor.name}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-text-muted mb-1">Type</p>
              <p className="text-sm font-semibold text-text-primary dark:text-white capitalize">
                {room.type.toLowerCase()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted mb-1">Beds</p>
              <p className="text-sm font-semibold text-text-primary dark:text-white">
                {occupiedCount}/{room.totalBeds}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted mb-1">Rent/Bed</p>
              <p className="text-sm font-semibold text-text-primary dark:text-white">
                {formatCurrency(room.rentPerBed)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted mb-1">Total Rent</p>
              <p className="text-sm font-semibold text-text-primary dark:text-white">
                {formatCurrency(
                  room.rentPerRoom || room.rentPerBed * room.totalBeds
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bed Grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title flex items-center gap-2">
            <BedDouble size={18} />
            Beds ({beds.length})
          </h3>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {vacantCount} Vacant
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {occupiedCount} Occupied
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {beds.map((bed) => (
            <div
              key={bed.id}
              className={`rounded-xl border-2 p-4 transition-all duration-200 ${getBedCardStyle(
                bed.status
              )}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getBedIcon(bed.status)}
                  <div>
                    <h4 className="font-semibold text-text-primary dark:text-white">
                      {bed.bedNumber}
                    </h4>
                    <span className={`text-xs ${getBadgeClass(bed.status)}`}>
                      {bed.status}
                    </span>
                  </div>
                </div>
              </div>

              {bed.status === "OCCUPIED" && bed.resident && (
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-text-muted flex-shrink-0" />
                    <span className="text-text-primary dark:text-white font-medium truncate">
                      {bed.resident.name}
                    </span>
                  </div>
                  {bed.resident.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={14} className="text-text-muted flex-shrink-0" />
                      <span className="text-text-muted">{bed.resident.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={14} className="text-text-muted flex-shrink-0" />
                    <span className="text-text-muted">
                      Since {formatDate(bed.resident.moveInDate)}
                    </span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-3 pt-3 border-t border-current/10">
                {bed.status === "VACANT" && (
                  <button
                    className="btn-success w-full text-sm flex items-center justify-center gap-2"
                    onClick={() =>
                      router.push(
                        `/hostel/${hostelId}/residents/add?bedId=${bed.id}&roomId=${roomId}`
                      )
                    }
                  >
                    <UserPlus size={14} />
                    Assign Resident
                  </button>
                )}
                {bed.status === "OCCUPIED" && bed.resident && (
                  <button
                    className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
                    onClick={() =>
                      router.push(
                        `/hostel/${hostelId}/residents/${bed.resident!.id}`
                      )
                    }
                  >
                    <Eye size={14} />
                    View Resident
                  </button>
                )}
                {bed.status === "RESERVED" && (
                  <div className="text-center text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    This bed is reserved
                  </div>
                )}
                {bed.status === "MAINTENANCE" && (
                  <div className="text-center text-xs text-gray-500 font-medium">
                    Under maintenance
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Room Inventory */}
      <div className="mb-6">
        <h3 className="section-title flex items-center gap-2 mb-4">
          <Package size={18} />
          Room Inventory
        </h3>
        {inventory.length === 0 ? (
          <div className="card text-center py-8">
            <Package size={32} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-muted">No inventory items recorded</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border dark:border-[#1E2D42] bg-bg-main/50 dark:bg-[#0B1222]/50">
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3">
                    Item
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3">
                    Qty
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3">
                    Condition
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3">
                    Last Checked
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-[#1E2D42]">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-bg-main/30 dark:hover:bg-[#111C2E]/30">
                    <td className="px-4 py-3 text-sm font-medium text-text-primary dark:text-white">
                      {item.itemName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          item.condition === "good"
                            ? "badge-success"
                            : item.condition === "damaged"
                            ? "badge-danger"
                            : "badge-warning"
                        }
                      >
                        {item.condition || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {item.lastChecked ? formatDate(item.lastChecked) : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Past Residents / History */}
      <div className="mb-6">
        <h3 className="section-title flex items-center gap-2 mb-4">
          <History size={18} />
          Bed History
        </h3>
        {pastResidents.length === 0 ? (
          <div className="card text-center py-8">
            <History size={32} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-muted">No past residents in this room</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border dark:border-[#1E2D42] bg-bg-main/50 dark:bg-[#0B1222]/50">
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3">
                    Resident
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3">
                    Bed
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3">
                    Move In
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3">
                    Move Out
                  </th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-[#1E2D42]">
                {pastResidents.map((resident) => (
                  <tr
                    key={resident.id}
                    className="hover:bg-bg-main/30 dark:hover:bg-[#111C2E]/30"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-text-primary dark:text-white">
                          {resident.name}
                        </p>
                        {resident.phone && (
                          <p className="text-xs text-text-muted">{resident.phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300">
                      {resident.bedNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {formatDate(resident.moveInDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {resident.moveOutDate
                        ? formatDate(resident.moveOutDate)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          resident.status === "CHECKED_OUT"
                            ? "badge-warning"
                            : "badge-danger"
                        }
                      >
                        {resident.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Room"
        message={`Are you sure you want to delete Room ${room.roomNumber}? This will also delete all beds and inventory. This action cannot be undone.`}
        confirmText="Delete Room"
        confirmVariant="danger"
        loading={deleting}
      />
    </DashboardLayout>
  );
}
