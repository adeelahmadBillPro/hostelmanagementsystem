"use client";

import { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { BedDouble, User } from "lucide-react";

// ==================== TYPES ====================

export interface RoomResident {
  name: string;
  bedNumber: string;
}

export interface FloorRoom {
  id: string;
  roomNumber: string;
  type: "SINGLE" | "DOUBLE" | "TRIPLE" | "QUAD";
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  status: string;
  residents: RoomResident[];
  beds?: {
    id: string;
    bedNumber: string;
    status: string;
    resident?: { id: string; name: string; phone: string; moveInDate: string } | null;
  }[];
}

interface FloorPlanProps {
  rooms: FloorRoom[];
  onRoomClick: (roomId: string) => void;
  selectedRoomId?: string;
  floorName?: string;
}

// ==================== HELPERS ====================

function getRoomStatusClass(room: FloorRoom): string {
  if (room.status === "MAINTENANCE") return "room-maintenance";
  if (room.occupiedBeds === 0) return "room-vacant";
  if (room.occupiedBeds < room.totalBeds) return "room-partial";
  return "room-full";
}

function getRoomColSpan(type: string): string {
  switch (type) {
    case "SINGLE":
      return "col-span-2";
    case "DOUBLE":
      return "col-span-3";
    case "TRIPLE":
      return "col-span-4";
    case "QUAD":
      return "col-span-4";
    default:
      return "col-span-3";
  }
}

function getRoomWidth(type: string): string {
  switch (type) {
    case "SINGLE":
      return "min-w-[120px]";
    case "DOUBLE":
      return "min-w-[160px]";
    case "TRIPLE":
      return "min-w-[200px]";
    case "QUAD":
      return "min-w-[200px]";
    default:
      return "min-w-[160px]";
  }
}

function getBedColor(status: string): string {
  switch (status) {
    case "VACANT":
      return "bg-emerald-400 border-emerald-600";
    case "OCCUPIED":
      return "bg-red-400 border-red-600";
    case "RESERVED":
      return "bg-indigo-400 border-indigo-600";
    case "MAINTENANCE":
      return "bg-gray-400 border-gray-600";
    default:
      return "bg-gray-300 border-gray-500";
  }
}

function getTypeBadgeColor(type: string): string {
  switch (type) {
    case "SINGLE":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "DOUBLE":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
    case "TRIPLE":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "QUAD":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getRoomBorderColor(room: FloorRoom): string {
  if (room.status === "MAINTENANCE") return "border-gray-400 dark:border-gray-600";
  if (room.occupiedBeds === 0) return "border-emerald-400 dark:border-emerald-600";
  if (room.occupiedBeds < room.totalBeds) return "border-amber-400 dark:border-amber-600";
  return "border-red-400 dark:border-red-600";
}

function getRoomBgColor(room: FloorRoom): string {
  if (room.status === "MAINTENANCE") return "bg-gray-50 dark:bg-gray-800/50";
  if (room.occupiedBeds === 0) return "bg-emerald-50/50 dark:bg-emerald-900/10";
  if (room.occupiedBeds < room.totalBeds) return "bg-amber-50/50 dark:bg-amber-900/10";
  return "bg-red-50/50 dark:bg-red-900/10";
}

// ==================== BED VISUAL ====================

function BedVisual({
  bed,
  delay,
}: {
  bed: { status: string; resident?: { name: string; phone?: string; moveInDate?: string } | null; bedNumber: string };
  delay: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const bedRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const residentLabel = bed.resident?.name
    ? bed.resident.name.slice(0, 3).toUpperCase()
    : "";

  const handleMouseEnter = () => {
    if (!bed.resident || !bedRef.current) return;
    const rect = bedRef.current.getBoundingClientRect();
    setTooltipPos({
      top: rect.top + window.scrollY - 8,
      left: rect.left + rect.width / 2,
    });
    setHover(true);
  };

  return (
    <div
      ref={bedRef}
      className={`relative transition-all duration-300 ${
        visible ? "scale-100 opacity-100" : "scale-0 opacity-0"
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHover(false)}
    >
      {/* Modern tooltip via portal */}
      {hover && bed.resident && typeof document !== "undefined" &&
        ReactDOM.createPortal(
          <div
            className="fixed z-[99999] pointer-events-none animate-fade-in"
            style={{ top: tooltipPos.top, left: tooltipPos.left, transform: "translate(-50%, -100%)" }}
          >
            <div className="bg-gray-900/95 backdrop-blur-md text-white rounded-xl px-4 py-3 shadow-2xl border border-white/10 min-w-[160px]">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                  {bed.resident.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-[13px] leading-tight">{bed.resident.name}</p>
                  <p className="text-[10px] text-gray-400">Bed {bed.bedNumber}</p>
                </div>
              </div>
              {bed.resident.phone && (
                <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-white/10">
                  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <span className="text-[11px] text-gray-300">{bed.resident.phone}</span>
                </div>
              )}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900/95" />
            </div>
          </div>,
          document.body
        )
      }

      {/* Bed shape */}
      <div
        className={`relative rounded-sm border-2 ${getBedColor(
          bed.status
        )} flex flex-col items-center justify-center overflow-hidden cursor-pointer group`}
        style={{ width: "38px", height: "52px" }}
      >
        {/* Hover glow effect for occupied */}
        {bed.resident && (
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-all duration-200" />
        )}
        {/* Headboard */}
        <div
          className="absolute top-0 left-0 right-0 h-[6px] rounded-t-sm"
          style={{
            background: "rgba(0,0,0,0.15)",
          }}
        />
        {/* Pillow */}
        <div
          className="absolute top-[8px] left-[6px] right-[6px] h-[6px] rounded-sm"
          style={{
            background: "rgba(255,255,255,0.5)",
          }}
        />
        {/* Resident label or icon */}
        <div className="mt-2 flex flex-col items-center">
          {residentLabel ? (
            <span className="text-[8px] font-bold text-white drop-shadow-sm leading-none">
              {residentLabel}
            </span>
          ) : (
            <BedDouble size={12} className="text-white/70" />
          )}
        </div>
        {/* Bed number */}
        <span className="text-[6px] text-white/60 absolute bottom-[2px]">
          {bed.bedNumber.split("-").pop()}
        </span>
      </div>
    </div>
  );
}

// ==================== BED LAYOUT ====================

function BedLayout({ room, baseDelay }: { room: FloorRoom; baseDelay: number }) {
  const beds = room.beds || [];

  // Build bed data from room.beds or fallback to generated beds
  const bedData =
    beds.length > 0
      ? beds.map((b) => ({
          status: b.status,
          resident: b.resident ? { name: b.resident.name, phone: b.resident.phone } : null,
          bedNumber: b.bedNumber,
        }))
      : Array.from({ length: room.totalBeds }, (_, i) => {
          const isOccupied = i < room.occupiedBeds;
          const resident = room.residents[i] || null;
          return {
            status: isOccupied ? "OCCUPIED" : "VACANT",
            resident: resident ? { name: resident.name } : null,
            bedNumber: `B${i + 1}`,
          };
        });

  // Layout based on room type
  switch (room.type) {
    case "SINGLE":
      return (
        <div className="flex justify-center py-1">
          {bedData[0] && <BedVisual bed={bedData[0]} delay={baseDelay} />}
        </div>
      );
    case "DOUBLE":
      return (
        <div className="flex gap-2 justify-center py-1">
          {bedData.slice(0, 2).map((bed, i) => (
            <BedVisual key={i} bed={bed} delay={baseDelay + i * 50} />
          ))}
        </div>
      );
    case "TRIPLE":
      return (
        <div className="flex flex-col items-center gap-1 py-1">
          <div className="flex gap-2">
            {bedData.slice(0, 2).map((bed, i) => (
              <BedVisual key={i} bed={bed} delay={baseDelay + i * 50} />
            ))}
          </div>
          <div className="flex justify-center">
            {bedData[2] && (
              <BedVisual bed={bedData[2]} delay={baseDelay + 100} />
            )}
          </div>
        </div>
      );
    case "QUAD":
      return (
        <div className="grid grid-cols-2 gap-1 justify-items-center py-1">
          {bedData.slice(0, 4).map((bed, i) => (
            <BedVisual key={i} bed={bed} delay={baseDelay + i * 50} />
          ))}
        </div>
      );
    default:
      return (
        <div className="flex flex-wrap gap-1 justify-center py-1">
          {bedData.map((bed, i) => (
            <BedVisual key={i} bed={bed} delay={baseDelay + i * 50} />
          ))}
        </div>
      );
  }
}

// ==================== ROOM TOOLTIP ====================

function RoomTooltip({ room }: { room: FloorRoom }) {
  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 pointer-events-none">
      <div className="font-bold text-sm mb-1">Room {room.roomNumber}</div>
      <div className="text-gray-300 mb-2">{room.type} Room</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-400">Total Beds:</span>
          <span>{room.totalBeds}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Occupied:</span>
          <span className="text-red-400">{room.occupiedBeds}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Vacant:</span>
          <span className="text-emerald-400">{room.vacantBeds}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Status:</span>
          <span>{room.status}</span>
        </div>
      </div>
      {room.residents.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="text-gray-400 mb-1">Residents:</div>
          {room.residents.slice(0, 3).map((r, i) => (
            <div key={i} className="flex items-center gap-1">
              <User size={10} className="text-gray-500" />
              <span>{r.name}</span>
            </div>
          ))}
          {room.residents.length > 3 && (
            <div className="text-gray-500">
              +{room.residents.length - 3} more
            </div>
          )}
        </div>
      )}
      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900" />
    </div>
  );
}

// ==================== ROOM BLOCK ====================

function RoomBlock({
  room,
  onClick,
  isSelected,
  animDelay,
}: {
  room: FloorRoom;
  onClick: () => void;
  isSelected: boolean;
  animDelay: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), animDelay);
    return () => clearTimeout(timer);
  }, [animDelay]);

  return (
    <div className={`${getRoomColSpan(room.type)} ${getRoomWidth(room.type)}`}>
      <div
        onClick={onClick}
        className={`
          relative cursor-pointer transition-all duration-500
          ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
          border-2 ${getRoomBorderColor(room)} ${getRoomBgColor(room)}
          rounded-md overflow-visible
          hover:shadow-lg hover:-translate-y-0.5
          ${
            isSelected
              ? "ring-2 ring-[#4F46E5] ring-offset-1 shadow-[0_0_12px_rgba(79,70,229,0.4)]"
              : ""
          }
        `}
        style={{
          /* Blueprint-style inner shadow */
          boxShadow: isSelected
            ? "0 0 12px rgba(79,70,229,0.4), inset 0 1px 3px rgba(0,0,0,0.1)"
            : "inset 0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {/* Room header */}
        <div className="flex items-center justify-between px-2 pt-1.5 pb-0.5">
          <span className="font-bold text-sm text-gray-800 dark:text-gray-100">
            {room.roomNumber}
          </span>
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${getTypeBadgeColor(
              room.type
            )}`}
          >
            {room.type}
          </span>
        </div>

        {/* Room interior - blueprint grid background */}
        <div
          className="mx-1.5 mb-1 rounded relative"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)",
            backgroundSize: "10px 10px",
          }}
        >
          {/* Door indicator */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-amber-600/40 rounded-t" />

          <BedLayout room={room} baseDelay={animDelay + 150} />
        </div>

        {/* Room footer */}
        <div className="px-2 pb-1.5 flex items-center justify-between">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
            {room.occupiedBeds}/{room.totalBeds} Beds
          </span>
          {room.status === "MAINTENANCE" && (
            <span className="text-[9px] font-semibold text-gray-500 bg-gray-200 dark:bg-gray-700 px-1 rounded">
              MAINT
            </span>
          )}
        </div>

        {/* Room info shown on click via parent handler */}
      </div>
    </div>
  );
}

// ==================== CORRIDOR ====================

function Corridor() {
  return (
    <div className="col-span-full flex items-center gap-2 py-1.5">
      <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
      <div className="flex gap-1">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"
          />
        ))}
      </div>
      <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-medium px-2">
        Corridor
      </span>
      <div className="flex gap-1">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"
          />
        ))}
      </div>
      <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
    </div>
  );
}

// ==================== FLOOR PLAN COMPONENT ====================

export default function FloorPlan({
  rooms,
  onRoomClick,
  selectedRoomId,
  floorName,
}: FloorPlanProps) {
  // Split rooms into two rows (left side and right side of corridor)
  const midpoint = Math.ceil(rooms.length / 2);
  const topRow = rooms.slice(0, midpoint);
  const bottomRow = rooms.slice(midpoint);

  return (
    <div className="w-full">
      {floorName && (
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
          {floorName}
        </div>
      )}

      <div
        className="relative rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-3"
        style={{
          /* Blueprint grid background */
          backgroundImage:
            "radial-gradient(circle, rgba(79,70,229,0.04) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      >
        {/* Wall top */}
        <div className="absolute top-0 left-4 right-4 h-[3px] bg-gray-300 dark:bg-gray-600 rounded-full" />

        {/* Top row of rooms */}
        <div className="flex flex-wrap gap-3 justify-start py-2">
          {topRow.map((room, i) => (
            <div key={room.id} className="flex-shrink-0">
              <RoomBlock
                room={room}
                onClick={() => onRoomClick(room.id)}
                isSelected={selectedRoomId === room.id}
                animDelay={i * 80}
              />
            </div>
          ))}
        </div>

        {/* Corridor */}
        {bottomRow.length > 0 && <Corridor />}

        {/* Bottom row of rooms */}
        {bottomRow.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-start py-2">
            {bottomRow.map((room, i) => (
              <div key={room.id} className="flex-shrink-0">
                <RoomBlock
                  room={room}
                  onClick={() => onRoomClick(room.id)}
                  isSelected={selectedRoomId === room.id}
                  animDelay={(midpoint + i) * 80}
                />
              </div>
            ))}
          </div>
        )}

        {/* Wall bottom */}
        <div className="absolute bottom-0 left-4 right-4 h-[3px] bg-gray-300 dark:bg-gray-600 rounded-full" />

        {/* Wall left */}
        <div className="absolute top-4 bottom-4 left-0 w-[3px] bg-gray-300 dark:bg-gray-600 rounded-full" />

        {/* Wall right */}
        <div className="absolute top-4 bottom-4 right-0 w-[3px] bg-gray-300 dark:bg-gray-600 rounded-full" />
      </div>
    </div>
  );
}
