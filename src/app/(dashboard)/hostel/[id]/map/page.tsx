"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import BuildingMap, { BuildingData } from "@/components/ui/building-map";
import RoomDetailPanel, {
  RoomDetail,
} from "@/components/ui/room-detail-panel";
import {
  Map,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Loader2,
  AlertTriangle,
  Building2,
  BedDouble,
  Users,
  CheckCircle2,
  Clock,
} from "lucide-react";

// ==================== TYPES ====================

interface MapStats {
  totalRooms: number;
  totalBeds: number;
  occupied: number;
  vacant: number;
  reserved: number;
  occupancyRate: number;
}

interface MapData {
  buildings: (BuildingData & {
    floors: {
      id: string;
      floorNumber: number;
      name: string;
      rooms: any[];
    }[];
  })[];
  stats: MapStats;
}

// ==================== PAGE COMPONENT ====================

export default function MapViewPage() {
  const params = useParams();
  const hostelId = params.id as string;

  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(
    null
  );
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoomDetail, setSelectedRoomDetail] =
    useState<RoomDetail | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Fetch map data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hostels/${hostelId}/map`);
      if (!res.ok) throw new Error("Failed to fetch map data");
      const json = await res.json();
      setData(json);

      // Select first building by default
      if (json.buildings.length > 0 && !selectedBuildingId) {
        setSelectedBuildingId(json.buildings[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Error loading map data");
    } finally {
      setLoading(false);
    }
  }, [hostelId, selectedBuildingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle room click - find room detail from data
  const handleRoomClick = (roomId: string) => {
    if (!data) return;
    setSelectedRoomId(roomId);

    // Find room in data
    for (const building of data.buildings) {
      for (const floor of building.floors) {
        const room: any = floor.rooms.find((r: any) => r.id === roomId);
        if (room) {
          setSelectedRoomDetail({
            id: room.id,
            roomNumber: room.roomNumber,
            type: room.type,
            totalBeds: room.totalBeds,
            rentPerBed: room.rentPerBed || 0,
            rentPerRoom: room.rentPerRoom || null,
            floor: room.floor || floor.name,
            building: room.building || building.name,
            floorId: floor.id,
            buildingId: building.id,
            beds: room.beds || [],
            inventory: room.inventory || [],
          });
          return;
        }
      }
    }
  };

  const handleCloseDetail = () => {
    setSelectedRoomId(null);
    setSelectedRoomDetail(null);
  };

  // Full screen toggle
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Zoom controls
  const zoomIn = () => setZoom((z) => Math.min(z + 10, 150));
  const zoomOut = () => setZoom((z) => Math.max(z - 10, 60));
  const resetZoom = () => setZoom(100);

  // Get selected building
  const selectedBuilding = data?.buildings.find(
    (b) => b.id === selectedBuildingId
  );

  // Content
  const content = (
    <div
      className={`${
        isFullScreen
          ? "fixed inset-0 z-30 bg-bg-main dark:bg-[#0B1222] overflow-auto"
          : ""
      }`}
    >
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {/* Building Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {data?.buildings.map((building) => (
            <button
              key={building.id}
              onClick={() => setSelectedBuildingId(building.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                selectedBuildingId === building.id
                  ? "btn-primary shadow-md"
                  : "btn-secondary hover:shadow"
              }`}
            >
              <Building2 size={14} />
              {building.name}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 mr-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-500 dark:text-gray-400">Vacant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-gray-500 dark:text-gray-400">Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-500 dark:text-gray-400">Full</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-gray-500 dark:text-gray-400">Reserved</span>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-1 py-0.5">
            <button
              onClick={zoomOut}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={14} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={resetZoom}
              className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors min-w-[40px]"
            >
              {zoom}%
            </button>
            <button
              onClick={zoomIn}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={14} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullScreen}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
          >
            {isFullScreen ? (
              <Minimize2 size={14} className="text-gray-600 dark:text-gray-400" />
            ) : (
              <Maximize2 size={14} className="text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Legend */}
      <div className="flex md:hidden items-center gap-3 mb-3 text-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-gray-500">Vacant</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-gray-500">Partial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-gray-500">Full</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span className="text-gray-500">Reserved</span>
        </div>
      </div>

      {/* Main Map Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2
            size={40}
            className="text-[#4F46E5] animate-spin mb-4"
          />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Loading floor plan...
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24">
          <AlertTriangle
            size={40}
            className="text-amber-500 mb-4"
          />
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
            Error loading map
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            {error}
          </p>
          <button onClick={fetchData} className="btn-primary px-4 py-2 rounded-lg text-sm">
            Retry
          </button>
        </div>
      ) : data?.buildings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Building2
            size={48}
            className="text-gray-300 dark:text-gray-600 mb-4"
          />
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
            No buildings found
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Add buildings and rooms to see the floor plan map.
          </p>
        </div>
      ) : selectedBuilding ? (
        <div
          className="overflow-auto"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top left",
            width: zoom !== 100 ? `${10000 / zoom}%` : "100%",
          }}
        >
          <BuildingMap
            building={selectedBuilding as BuildingData}
            onRoomClick={handleRoomClick}
            selectedRoomId={selectedRoomId || undefined}
          />
        </div>
      ) : null}

      {/* Stats Bar */}
      {data && data.stats && (
        <div className="mt-4 card p-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                  <BedDouble size={16} className="text-[#4F46E5]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {data.stats.totalBeds}
                  </div>
                  <div className="text-[10px] text-gray-500">Total Beds</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <Users size={16} className="text-red-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {data.stats.occupied}
                  </div>
                  <div className="text-[10px] text-gray-500">Occupied</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {data.stats.vacant}
                  </div>
                  <div className="text-[10px] text-gray-500">Vacant</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <Clock size={16} className="text-amber-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {data.stats.reserved}
                  </div>
                  <div className="text-[10px] text-gray-500">Reserved</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div
                  className={`text-lg font-bold ${
                    data.stats.occupancyRate > 90
                      ? "text-red-500"
                      : data.stats.occupancyRate > 60
                      ? "text-amber-500"
                      : "text-emerald-500"
                  }`}
                >
                  {data.stats.occupancyRate}%
                </div>
                <div className="text-[10px] text-gray-500">Occupancy Rate</div>
              </div>
              <div className="w-24 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${data.stats.occupancyRate}%`,
                    background:
                      data.stats.occupancyRate > 90
                        ? "#EF4444"
                        : data.stats.occupancyRate > 60
                        ? "#F59E0B"
                        : "#10B981",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Detail Panel */}
      <RoomDetailPanel
        room={selectedRoomDetail}
        onClose={handleCloseDetail}
        hostelId={hostelId}
      />
    </div>
  );

  if (isFullScreen) {
    return (
      <div className="p-4 lg:p-6">
        {/* Full screen close button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Map size={20} className="text-[#4F46E5]" />
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">
              Hostel Map View
            </h1>
          </div>
          <button
            onClick={toggleFullScreen}
            className="btn-secondary px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5"
          >
            <Minimize2 size={14} />
            Exit Full Screen
          </button>
        </div>
        {content}
      </div>
    );
  }

  return (
    <DashboardLayout title="Hostel Map View" hostelId={hostelId}>
      {content}
    </DashboardLayout>
  );
}
