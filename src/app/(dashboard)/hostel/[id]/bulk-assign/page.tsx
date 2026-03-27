"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useToast } from "@/components/providers";
import {
  Users,
  Building2,
  Layers,
  DoorOpen,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";

interface Resident {
  id: string;
  name: string;
  email: string;
  currentRoom: string;
  currentBed: string;
  status: string;
}

interface Building {
  id: string;
  name: string;
}

interface Floor {
  id: string;
  name: string;
  floorNumber: number;
  buildingId: string;
}

interface Room {
  id: string;
  roomNumber: string;
  floorId: string;
  type: string;
}

interface Bed {
  id: string;
  bedNumber: string;
  roomId: string;
  status: string;
}

interface Assignment {
  residentId: string;
  residentName: string;
  buildingId: string;
  floorId: string;
  roomId: string;
  bedId: string;
}

export default function BulkAssignPage() {
  const params = useParams();
  const hostelId = params.id as string;
  const { addToast } = useToast();

  const [residents, setResidents] = useState<Resident[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{ assigned: number; failed: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resRes, infraRes] = await Promise.all([
        fetch(`/api/hostels/${hostelId}/residents?status=ACTIVE`),
        fetch(`/api/hostels/${hostelId}/infrastructure`),
      ]);

      if (resRes.ok) {
        const resData = await resRes.json();
        const residentList = (resData.residents || resData || []).map((r: any) => ({
          id: r.id,
          name: r.user?.name || r.name || "Unknown",
          email: r.user?.email || r.email || "",
          currentRoom: r.room?.roomNumber || r.roomNumber || "Unassigned",
          currentBed: r.bed?.bedNumber || r.bedNumber || "Unassigned",
          status: r.status,
        }));
        setResidents(residentList);
        // Initialize assignments for all residents
        setAssignments(
          residentList.map((r: Resident) => ({
            residentId: r.id,
            residentName: r.name,
            buildingId: "",
            floorId: "",
            roomId: "",
            bedId: "",
          }))
        );
      }

      if (infraRes.ok) {
        const infraData = await infraRes.json();
        setBuildings(infraData.buildings || []);
        setFloors(infraData.floors || []);
        setRooms(infraData.rooms || []);
        setBeds(infraData.beds || []);
      } else {
        // Fallback: fetch buildings separately
        const bldgRes = await fetch(`/api/hostels/${hostelId}/buildings`);
        if (bldgRes.ok) {
          const bldgData = await bldgRes.json();
          const bldgs = bldgData.buildings || bldgData || [];
          setBuildings(bldgs);

          // Fetch all floor/room/bed data
          const allFloors: Floor[] = [];
          const allRooms: Room[] = [];
          const allBeds: Bed[] = [];

          for (const b of bldgs) {
            const floorRes = await fetch(`/api/hostels/${hostelId}/buildings/${b.id}/floors`);
            if (floorRes.ok) {
              const floorData = await floorRes.json();
              const fls = floorData.floors || floorData || [];
              for (const f of fls) {
                allFloors.push({ ...f, buildingId: b.id });
                const roomRes = await fetch(`/api/hostels/${hostelId}/floors/${f.id}/rooms`);
                if (roomRes.ok) {
                  const roomData = await roomRes.json();
                  const rms = roomData.rooms || roomData || [];
                  for (const r of rms) {
                    allRooms.push({ ...r, floorId: f.id });
                    if (r.beds) {
                      for (const bed of r.beds) {
                        allBeds.push({ ...bed, roomId: r.id });
                      }
                    }
                  }
                }
              }
            }
          }
          setFloors(allFloors);
          setRooms(allRooms);
          setBeds(allBeds);
        }
      }
    } catch (err) {
      addToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [hostelId, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateAssignment = (index: number, field: keyof Assignment, value: string) => {
    setAssignments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Cascade clear
      if (field === "buildingId") {
        updated[index].floorId = "";
        updated[index].roomId = "";
        updated[index].bedId = "";
      } else if (field === "floorId") {
        updated[index].roomId = "";
        updated[index].bedId = "";
      } else if (field === "roomId") {
        updated[index].bedId = "";
      }
      return updated;
    });
  };

  const getFloorsForBuilding = (buildingId: string) =>
    floors.filter((f) => f.buildingId === buildingId);

  const getRoomsForFloor = (floorId: string) =>
    rooms.filter((r) => r.floorId === floorId);

  const getBedsForRoom = (roomId: string) =>
    beds.filter((b) => b.roomId === roomId && b.status === "VACANT");

  const handleAssignAll = async () => {
    const validAssignments = assignments.filter(
      (a) => a.residentId && a.roomId && a.bedId
    );

    if (validAssignments.length === 0) {
      addToast("No valid assignments to submit. Select room and bed for at least one resident.", "warning");
      return;
    }

    setSubmitting(true);
    setResults(null);

    try {
      const res = await fetch(`/api/hostels/${hostelId}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk-assign",
          assignments: validAssignments.map((a) => ({
            residentId: a.residentId,
            roomId: a.roomId,
            bedId: a.bedId,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResults({
          assigned: data.count || 0,
          failed: data.failed?.length || 0,
        });
        addToast(`${data.count} residents assigned successfully`, "success");
        fetchData();
      } else {
        addToast(data.error || "Assignment failed", "error");
      }
    } catch {
      addToast("Failed to submit assignments", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Bulk Room Assignment" hostelId={hostelId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Bulk Room Assignment
            </h2>
            <p className="text-gray-500 dark:text-slate-400 mt-1">
              Assign multiple residents to rooms and beds at once
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchData}
              className="btn-secondary flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={handleAssignAll}
              className="btn-primary flex items-center gap-2"
              disabled={submitting || loading}
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Users size={16} />
              )}
              Assign All
            </button>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="card p-4 flex items-center gap-6">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 size={20} />
              <span className="font-semibold">{results.assigned} Assigned</span>
            </div>
            {results.failed > 0 && (
              <div className="flex items-center gap-2 text-red-500">
                <XCircle size={20} />
                <span className="font-semibold">{results.failed} Failed</span>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : residents.length === 0 ? (
          <div className="card p-12 text-center text-gray-500 dark:text-slate-400">
            No active residents found
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#1E2D42]">
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Resident
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Current
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Building2 size={14} />
                      Building
                    </div>
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Layers size={14} />
                      Floor
                    </div>
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <DoorOpen size={14} />
                      Room
                    </div>
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Bed
                  </th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment, index) => {
                  const resident = residents[index];
                  if (!resident) return null;

                  const availableFloors = getFloorsForBuilding(assignment.buildingId);
                  const availableRooms = getRoomsForFloor(assignment.floorId);
                  const availableBeds = getBedsForRoom(assignment.roomId);

                  return (
                    <tr
                      key={assignment.residentId}
                      className="border-b border-gray-100 dark:border-[#1E2D42] hover:bg-gray-50 dark:hover:bg-[#111C2E] transition-colors"
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {resident.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {resident.email}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-slate-300">
                        {resident.currentRoom} / {resident.currentBed}
                      </td>
                      <td className="p-4">
                        <select
                          className="select text-sm w-full min-w-[130px]"
                          value={assignment.buildingId}
                          onChange={(e) => updateAssignment(index, "buildingId", e.target.value)}
                        >
                          <option value="">Select...</option>
                          {buildings.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <select
                          className="select text-sm w-full min-w-[120px]"
                          value={assignment.floorId}
                          onChange={(e) => updateAssignment(index, "floorId", e.target.value)}
                          disabled={!assignment.buildingId}
                        >
                          <option value="">Select...</option>
                          {availableFloors.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <select
                          className="select text-sm w-full min-w-[120px]"
                          value={assignment.roomId}
                          onChange={(e) => updateAssignment(index, "roomId", e.target.value)}
                          disabled={!assignment.floorId}
                        >
                          <option value="">Select...</option>
                          {availableRooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.roomNumber}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <select
                          className="select text-sm w-full min-w-[120px]"
                          value={assignment.bedId}
                          onChange={(e) => updateAssignment(index, "bedId", e.target.value)}
                          disabled={!assignment.roomId}
                        >
                          <option value="">Select...</option>
                          {availableBeds.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.bedNumber}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
