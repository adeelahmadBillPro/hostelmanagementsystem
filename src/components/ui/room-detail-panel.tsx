"use client";

import { useEffect, useState } from "react";
import {
  X,
  BedDouble,
  User,
  Phone,
  Calendar,
  ChevronRight,
  Wrench,
  Edit3,
  Package,
  UserPlus,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

// ==================== TYPES ====================

interface BedResident {
  id: string;
  name: string;
  phone: string;
  moveInDate: string;
}

interface RoomBed {
  id: string;
  bedNumber: string;
  status: string;
  resident?: BedResident | null;
}

interface RoomInventoryItem {
  itemName: string;
  quantity: number;
  condition: string;
}

export interface RoomDetail {
  id: string;
  roomNumber: string;
  type: string;
  totalBeds: number;
  rentPerBed: number;
  rentPerRoom: number | null;
  floor: string;
  building: string;
  floorId?: string;
  buildingId?: string;
  beds: RoomBed[];
  inventory: RoomInventoryItem[];
}

interface RoomDetailPanelProps {
  room: RoomDetail | null;
  onClose: () => void;
  hostelId: string;
}

// ==================== HELPERS ====================

function getBedStatusConfig(status: string) {
  switch (status) {
    case "VACANT":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
        label: "Vacant",
        labelClass: "badge-success",
        iconColor: "text-emerald-500",
      };
    case "OCCUPIED":
      return {
        bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
        label: "Occupied",
        labelClass: "badge-danger",
        iconColor: "text-red-500",
      };
    case "RESERVED":
      return {
        bg: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
        label: "Reserved",
        labelClass: "badge-primary",
        iconColor: "text-indigo-500",
      };
    case "MAINTENANCE":
      return {
        bg: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
        label: "Maintenance",
        labelClass: "badge-warning",
        iconColor: "text-gray-500",
      };
    default:
      return {
        bg: "bg-gray-50 border-gray-200",
        label: status,
        labelClass: "badge-warning",
        iconColor: "text-gray-500",
      };
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number): string {
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

function getConditionColor(condition: string): string {
  switch (condition?.toLowerCase()) {
    case "good":
      return "text-emerald-600";
    case "damaged":
      return "text-red-600";
    case "needs_repair":
      return "text-amber-600";
    default:
      return "text-gray-600";
  }
}

// ==================== BED CARD ====================

function BedCard({
  bed,
  hostelId,
  roomId,
  animDelay,
}: {
  bed: RoomBed;
  hostelId: string;
  roomId: string;
  animDelay: number;
}) {
  const [visible, setVisible] = useState(false);
  const config = getBedStatusConfig(bed.status);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), animDelay);
    return () => clearTimeout(timer);
  }, [animDelay]);

  return (
    <div
      className={`transition-all duration-400 ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
      } rounded-lg border ${config.bg} p-3`}
    >
      {/* Bed header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BedDouble size={16} className={config.iconColor} />
          <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
            {bed.bedNumber}
          </span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.labelClass}`}>
          {config.label}
        </span>
      </div>

      {/* Content based on status */}
      {bed.status === "OCCUPIED" && bed.resident && (
        <div className="space-y-1.5 ml-6">
          <div className="flex items-center gap-2">
            <User size={12} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {bed.resident.name}
            </span>
          </div>
          {bed.resident.phone && (
            <div className="flex items-center gap-2">
              <Phone size={12} className="text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {bed.resident.phone}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Since {formatDate(bed.resident.moveInDate)}
            </span>
          </div>
          <Link
            href={`/hostel/${hostelId}/residents/${bed.resident.id}`}
            className="inline-flex items-center gap-1 text-xs text-[#4F46E5] hover:text-[#4338CA] font-medium mt-1"
          >
            View Profile
            <ExternalLink size={10} />
          </Link>
        </div>
      )}

      {bed.status === "VACANT" && (
        <div className="ml-6">
          <Link
            href={`/hostel/${hostelId}/residents/add?roomId=${roomId}&bedId=${bed.id}`}
            className="inline-flex items-center gap-1.5 text-xs btn-primary px-3 py-1.5 rounded-md"
          >
            <UserPlus size={12} />
            Assign Resident
          </Link>
        </div>
      )}

      {bed.status === "RESERVED" && (
        <div className="ml-6">
          <p className="text-xs text-indigo-600 dark:text-indigo-400">
            This bed is reserved for an upcoming resident.
          </p>
        </div>
      )}

      {bed.status === "MAINTENANCE" && (
        <div className="ml-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Under maintenance. Not available for allocation.
          </p>
        </div>
      )}
    </div>
  );
}

// ==================== ROOM DETAIL PANEL ====================

export default function RoomDetailPanel({
  room,
  onClose,
  hostelId,
}: RoomDetailPanelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (room) {
      // Small delay for animation
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [room]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  if (!room) return null;

  const occupiedBeds = room.beds.filter((b) => b.status === "OCCUPIED").length;
  const vacantBeds = room.beds.filter((b) => b.status === "VACANT").length;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[400px] max-w-full bg-white dark:bg-gray-900 z-50
          shadow-2xl transition-transform duration-300 ease-out
          ${isVisible ? "translate-x-0" : "translate-x-full"}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Room {room.roomNumber}
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  room.type === "SINGLE"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : room.type === "DOUBLE"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                    : room.type === "TRIPLE"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                }`}
              >
                {room.type}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{room.building}</span>
            <ChevronRight size={12} />
            <span>{room.floor}</span>
            <ChevronRight size={12} />
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              Room {room.roomNumber}
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Quick Stats */}
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                <div className="text-lg font-bold text-blue-600">{room.totalBeds}</div>
                <div className="text-[10px] text-blue-500">Total Beds</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/10">
                <div className="text-lg font-bold text-red-600">{occupiedBeds}</div>
                <div className="text-[10px] text-red-500">Occupied</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10">
                <div className="text-lg font-bold text-emerald-600">{vacantBeds}</div>
                <div className="text-[10px] text-emerald-500">Vacant</div>
              </div>
            </div>
          </div>

          {/* Rent Info */}
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Rent Information
            </h3>
            <div className="flex gap-4">
              <div>
                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  {formatCurrency(room.rentPerBed)}
                </div>
                <div className="text-[10px] text-gray-500">Per Bed / Month</div>
              </div>
              {room.rentPerRoom && (
                <div>
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {formatCurrency(room.rentPerRoom)}
                  </div>
                  <div className="text-[10px] text-gray-500">Per Room / Month</div>
                </div>
              )}
            </div>
          </div>

          {/* Bed Visual Grid */}
          <div className="px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Bed Layout
            </h3>
            <div className="space-y-3">
              {room.beds.map((bed, i) => (
                <BedCard
                  key={bed.id}
                  bed={bed}
                  hostelId={hostelId}
                  roomId={room.id}
                  animDelay={200 + i * 100}
                />
              ))}
            </div>
          </div>

          {/* Room Inventory */}
          {room.inventory && room.inventory.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Package size={12} />
                Room Inventory
              </h3>
              <div className="space-y-2">
                {room.inventory.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 px-3 rounded-md bg-gray-50 dark:bg-gray-800/50 text-sm"
                  >
                    <span className="text-gray-700 dark:text-gray-300">
                      {item.itemName}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-xs">
                        Qty: {item.quantity}
                      </span>
                      <span
                        className={`text-xs font-medium ${getConditionColor(
                          item.condition
                        )}`}
                      >
                        {item.condition}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 px-5 py-3 flex gap-2">
          <Link
            href={`/hostel/${hostelId}/rooms?edit=${room.id}`}
            className="flex-1 btn-primary flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium"
          >
            <Edit3 size={14} />
            Edit Room
          </Link>
          <button className="flex-1 btn-secondary flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium">
            <Wrench size={14} />
            Maintenance
          </button>
        </div>
      </div>
    </>
  );
}
