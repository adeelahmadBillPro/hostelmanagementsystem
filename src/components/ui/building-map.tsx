"use client";

import { useState } from "react";
import FloorPlan, { FloorRoom } from "./floor-plan";
import {
  Building2,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Minus,
} from "lucide-react";

// ==================== TYPES ====================

export interface FloorData {
  id: string;
  floorNumber: number;
  name: string;
  rooms: FloorRoom[];
}

export interface BuildingData {
  id: string;
  name: string;
  floors: FloorData[];
}

interface BuildingMapProps {
  building: BuildingData;
  onRoomClick: (roomId: string) => void;
  selectedRoomId?: string;
}

// ==================== FLOOR LABEL ====================

function FloorLabel({
  floorNumber,
  name,
  isCollapsed,
  onToggle,
  roomCount,
  occupiedCount,
}: {
  floorNumber: number;
  name: string;
  isCollapsed: boolean;
  onToggle: () => void;
  roomCount: number;
  occupiedCount: number;
}) {
  const label =
    floorNumber === 0
      ? "GF"
      : floorNumber === -1
      ? "B1"
      : `F${floorNumber}`;

  return (
    <button
      onClick={onToggle}
      className="flex flex-col items-center justify-center min-w-[56px] py-3 px-2
                 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800
                 border-r-2 border-gray-300 dark:border-gray-600
                 hover:from-indigo-50 hover:to-indigo-100 dark:hover:from-indigo-900/30 dark:hover:to-indigo-800/30
                 transition-all group cursor-pointer"
    >
      <span className="text-lg font-extrabold text-gray-700 dark:text-gray-200 group-hover:text-[#4F46E5]">
        {label}
      </span>
      <span className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[52px]">
        {name}
      </span>
      <div className="flex items-center gap-0.5 mt-1">
        <span className="text-[8px] text-gray-400">{roomCount}R</span>
        <Minus size={6} className="text-gray-300" />
        <span className="text-[8px] text-emerald-500">
          {roomCount - occupiedCount}V
        </span>
      </div>
      {isCollapsed ? (
        <ChevronDown size={12} className="text-gray-400 mt-1" />
      ) : (
        <ChevronUp size={12} className="text-gray-400 mt-1" />
      )}
    </button>
  );
}

// ==================== ELEVATOR SHAFT ====================

function ElevatorShaft({ floorCount }: { floorCount: number }) {
  return (
    <div className="flex flex-col items-center justify-between py-2 px-1 min-w-[20px]">
      {/* Elevator cable */}
      <div className="relative w-[2px] bg-gray-300 dark:bg-gray-600 flex-1">
        {/* Dots per floor */}
        {Array.from({ length: floorCount }).map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 border border-gray-300 dark:border-gray-600"
            style={{
              top: `${(i / Math.max(floorCount - 1, 1)) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>
      {/* Elevator icon */}
      <ArrowUpDown size={10} className="text-gray-400 mt-1" />
    </div>
  );
}

// ==================== STAIRCASE DIVIDER ====================

function StaircaseDivider() {
  return (
    <div className="flex items-center px-2 py-0.5 ml-[56px]">
      <div className="flex-1 flex items-center gap-1">
        {/* Stair steps */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-[2px] bg-gray-200 dark:bg-gray-700 flex-1"
            style={{
              transform: `translateY(${(i - 3) * 1}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ==================== BUILDING MAP COMPONENT ====================

export default function BuildingMap({
  building,
  onRoomClick,
  selectedRoomId,
}: BuildingMapProps) {
  const [collapsedFloors, setCollapsedFloors] = useState<string[]>([]);

  // Sort floors: top floor first (highest floorNumber at top)
  const sortedFloors = [...building.floors].sort(
    (a, b) => b.floorNumber - a.floorNumber
  );

  const toggleFloor = (floorId: string) => {
    setCollapsedFloors((prev) =>
      prev.includes(floorId)
        ? prev.filter((id) => id !== floorId)
        : [...prev, floorId]
    );
  };

  // Calculate building stats
  const totalRooms = sortedFloors.reduce((sum, f) => sum + f.rooms.length, 0);
  const totalBeds = sortedFloors.reduce(
    (sum, f) => sum + f.rooms.reduce((s, r) => s + r.totalBeds, 0),
    0
  );
  const occupiedBeds = sortedFloors.reduce(
    (sum, f) => sum + f.rooms.reduce((s, r) => s + r.occupiedBeds, 0),
    0
  );
  const vacantBeds = totalBeds - occupiedBeds;
  const occupancyRate =
    totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm bg-white dark:bg-gray-900">
      {/* Building Header */}
      <div className="bg-[#1E1B4B] dark:bg-[#0F0D2E] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">
              {building.name}
            </h3>
            <p className="text-indigo-300 text-xs">
              {sortedFloors.length} Floor{sortedFloors.length !== 1 ? "s" : ""}{" "}
              &middot; {totalRooms} Rooms
            </p>
          </div>
        </div>
        {/* Mini occupancy bar */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-white text-sm font-bold">{occupancyRate}%</div>
            <div className="text-indigo-300 text-[10px]">Occupancy</div>
          </div>
          <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${occupancyRate}%`,
                background:
                  occupancyRate > 90
                    ? "#EF4444"
                    : occupancyRate > 60
                    ? "#F59E0B"
                    : "#10B981",
              }}
            />
          </div>
        </div>
      </div>

      {/* Roof decoration */}
      <div className="h-1.5 bg-gradient-to-r from-gray-400 via-gray-300 to-gray-400 dark:from-gray-600 dark:via-gray-500 dark:to-gray-600" />

      {/* Floors Container */}
      <div className="relative flex">
        {/* Elevator shaft on left */}
        <div className="border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-1">
          <ElevatorShaft floorCount={sortedFloors.length} />
        </div>

        {/* Floors */}
        <div className="flex-1">
          {sortedFloors.map((floor, floorIndex) => {
            const isCollapsed = collapsedFloors.includes(floor.id);
            const floorOccupied = floor.rooms.reduce(
              (s, r) => s + r.occupiedBeds,
              0
            );
            const roomCount = floor.rooms.length;
            // Count rooms that are fully occupied
            const fullRooms = floor.rooms.filter(
              (r) => r.occupiedBeds >= r.totalBeds
            ).length;

            return (
              <div key={floor.id}>
                {/* Staircase between floors */}
                {floorIndex > 0 && <StaircaseDivider />}

                {/* Floor row */}
                <div
                  className={`flex border-b border-gray-100 dark:border-gray-800 ${
                    floorIndex % 2 === 0
                      ? "bg-white dark:bg-gray-900"
                      : "bg-gray-50/50 dark:bg-gray-850/50"
                  }`}
                >
                  {/* Floor label */}
                  <FloorLabel
                    floorNumber={floor.floorNumber}
                    name={floor.name}
                    isCollapsed={isCollapsed}
                    onToggle={() => toggleFloor(floor.id)}
                    roomCount={roomCount}
                    occupiedCount={fullRooms}
                  />

                  {/* Floor plan */}
                  <div className="flex-1 p-3">
                    {isCollapsed ? (
                      <div className="flex items-center gap-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{roomCount} rooms</span>
                        <span className="text-emerald-500">
                          {roomCount - fullRooms} available
                        </span>
                        <span className="text-red-500">
                          {fullRooms} full
                        </span>
                        <span className="text-xs text-gray-400">
                          (Click floor label to expand)
                        </span>
                      </div>
                    ) : (
                      <FloorPlan
                        rooms={floor.rooms}
                        onRoomClick={onRoomClick}
                        selectedRoomId={selectedRoomId}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Building Foundation */}
      <div className="h-2 bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500 dark:from-gray-600 dark:via-gray-500 dark:to-gray-600" />

      {/* Stats Footer */}
      <div className="bg-gray-50 dark:bg-gray-800/80 px-5 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
            <span className="text-gray-600 dark:text-gray-400">
              Rooms: <span className="font-bold text-gray-800 dark:text-gray-200">{totalRooms}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Occupied: <span className="font-bold text-gray-800 dark:text-gray-200">{occupiedBeds}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Vacant: <span className="font-bold text-gray-800 dark:text-gray-200">{vacantBeds}</span>
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Occupancy:{" "}
          <span
            className={`font-bold ${
              occupancyRate > 90
                ? "text-red-500"
                : occupancyRate > 60
                ? "text-amber-500"
                : "text-emerald-500"
            }`}
          >
            {occupancyRate}%
          </span>
        </div>
      </div>
    </div>
  );
}
