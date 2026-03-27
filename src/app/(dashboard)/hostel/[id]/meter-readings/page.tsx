"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/ui/stat-card";
import { useToast } from "@/components/providers";
import { formatCurrency } from "@/lib/utils";
import {
  Activity,
  Save,
  Loader2,
  Zap,
  DoorOpen,
  Calculator,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface RoomReading {
  roomId: string;
  roomNumber: string;
  buildingName: string;
  floorName: string;
  previousReading: number;
  currentReading: number;
  ratePerUnit: number;
  units: number;
  amount: number;
}

export default function MeterReadingsPage() {
  const params = useParams();
  const hostelId = params.id as string;
  const { addToast } = useToast();

  const [readings, setReadings] = useState<RoomReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [defaultRate, setDefaultRate] = useState(35);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hostels/${hostelId}/rooms?include=meterReadings`);
      if (!res.ok) {
        // Fallback: try different endpoint
        const res2 = await fetch(`/api/hostels/${hostelId}/buildings`);
        if (res2.ok) {
          const data = await res2.json();
          const bldgs = data.buildings || data || [];
          const roomReadings: RoomReading[] = [];

          for (const b of bldgs) {
            if (b.floors) {
              for (const f of b.floors) {
                if (f.rooms) {
                  for (const r of f.rooms) {
                    // Get last meter reading for this room
                    const lastReading = r.meterReadings?.sort(
                      (a: any, b: any) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime()
                    )[0];

                    roomReadings.push({
                      roomId: r.id,
                      roomNumber: r.roomNumber,
                      buildingName: b.name,
                      floorName: f.name,
                      previousReading: lastReading?.currentReading || 0,
                      currentReading: lastReading?.currentReading || 0,
                      ratePerUnit: lastReading?.ratePerUnit || defaultRate,
                      units: 0,
                      amount: 0,
                    });
                  }
                }
              }
            }
          }
          setReadings(roomReadings);
          setLoading(false);
          return;
        }
      }

      const data = await res.json();
      const roomList = data.rooms || data || [];
      const roomReadings: RoomReading[] = roomList.map((r: any) => {
        const lastReading = r.meterReadings?.sort(
          (a: any, b: any) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime()
        )[0];

        return {
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingName: r.floor?.building?.name || r.buildingName || "",
          floorName: r.floor?.name || r.floorName || "",
          previousReading: lastReading?.currentReading || 0,
          currentReading: lastReading?.currentReading || 0,
          ratePerUnit: lastReading?.ratePerUnit || defaultRate,
          units: 0,
          amount: 0,
        };
      });

      setReadings(roomReadings);
    } catch (err) {
      addToast("Failed to load rooms", "error");
    } finally {
      setLoading(false);
    }
  }, [hostelId, defaultRate, addToast]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const updateReading = (index: number, field: "currentReading" | "ratePerUnit", value: number) => {
    setReadings((prev) => {
      const updated = [...prev];
      const reading = { ...updated[index], [field]: value };
      reading.units = Math.max(0, reading.currentReading - reading.previousReading);
      reading.amount = reading.units * reading.ratePerUnit;
      updated[index] = reading;
      return updated;
    });
  };

  const applyDefaultRate = () => {
    setReadings((prev) =>
      prev.map((r) => {
        const updated = { ...r, ratePerUnit: defaultRate };
        updated.amount = updated.units * updated.ratePerUnit;
        return updated;
      })
    );
  };

  const handleSaveAll = async () => {
    const validReadings = readings.filter((r) => r.currentReading > r.previousReading);

    if (validReadings.length === 0) {
      addToast("No new readings to save. Enter current readings greater than previous.", "warning");
      return;
    }

    setSubmitting(true);
    setResults(null);

    try {
      const res = await fetch(`/api/hostels/${hostelId}/bulk/meter-readings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readings: validReadings.map((r) => ({
            roomId: r.roomId,
            previousReading: r.previousReading,
            currentReading: r.currentReading,
            ratePerUnit: r.ratePerUnit,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResults({
          success: data.success || 0,
          failed: data.failed?.length || 0,
        });
        addToast(`${data.success} meter readings saved successfully`, "success");
        fetchRooms();
      } else {
        addToast(data.error || "Failed to save readings", "error");
      }
    } catch {
      addToast("Failed to save readings", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const totalUnits = readings.reduce((sum, r) => sum + r.units, 0);
  const totalAmount = readings.reduce((sum, r) => sum + r.amount, 0);
  const roomsWithReadings = readings.filter((r) => r.currentReading > r.previousReading).length;

  return (
    <DashboardLayout title="Meter Readings" hostelId={hostelId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Meter Readings
            </h2>
            <p className="text-gray-500 dark:text-slate-400 mt-1">
              Enter electricity meter readings for all rooms
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchRooms}
              className="btn-secondary flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={handleSaveAll}
              className="btn-success flex items-center gap-2"
              disabled={submitting || loading}
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save All
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Rooms"
            value={readings.length}
            icon={DoorOpen}
            iconColor="#60A5FA"
            delay={0}
          />
          <StatCard
            label="Rooms with New Readings"
            value={roomsWithReadings}
            icon={Activity}
            iconColor="#34D399"
            delay={100}
          />
          <StatCard
            label="Total Units"
            value={totalUnits.toFixed(1)}
            icon={Zap}
            iconColor="#FBBF24"
            delay={200}
          />
          <StatCard
            label="Total Amount"
            value={formatCurrency(totalAmount)}
            icon={Calculator}
            iconColor="#F472B6"
            delay={300}
          />
        </div>

        {/* Results */}
        {results && (
          <div className="card p-4 flex items-center gap-6">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 size={20} />
              <span className="font-semibold">{results.success} Saved</span>
            </div>
            {results.failed > 0 && (
              <div className="flex items-center gap-2 text-red-500">
                <XCircle size={20} />
                <span className="font-semibold">{results.failed} Failed</span>
              </div>
            )}
          </div>
        )}

        {/* Default Rate */}
        <div className="card p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="label whitespace-nowrap">Default Rate/Unit:</label>
            <input
              type="number"
              className="input w-32"
              value={defaultRate}
              onChange={(e) => setDefaultRate(parseFloat(e.target.value) || 0)}
              min={0}
              step={0.5}
            />
            <button onClick={applyDefaultRate} className="btn-secondary text-sm">
              Apply to All
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : readings.length === 0 ? (
          <div className="card p-12 text-center text-gray-500 dark:text-slate-400">
            No rooms found in this hostel
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#1E2D42]">
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Room #
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Building / Floor
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Previous
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Current
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Rate/Unit
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Units
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {readings.map((reading, index) => (
                  <tr
                    key={reading.roomId}
                    className="border-b border-gray-100 dark:border-[#1E2D42] hover:bg-gray-50 dark:hover:bg-[#111C2E] transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">
                        {reading.roomNumber}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-slate-300">
                      {reading.buildingName} / {reading.floorName}
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-600 dark:text-slate-300 font-mono">
                        {reading.previousReading}
                      </span>
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        className="input w-28 text-sm font-mono"
                        value={reading.currentReading || ""}
                        onChange={(e) =>
                          updateReading(index, "currentReading", parseFloat(e.target.value) || 0)
                        }
                        min={reading.previousReading}
                        step={1}
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        className="input w-24 text-sm font-mono"
                        value={reading.ratePerUnit || ""}
                        onChange={(e) =>
                          updateReading(index, "ratePerUnit", parseFloat(e.target.value) || 0)
                        }
                        min={0}
                        step={0.5}
                      />
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-sm font-mono font-semibold ${
                          reading.units > 0
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-gray-400 dark:text-slate-500"
                        }`}
                      >
                        {reading.units.toFixed(1)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-sm font-semibold ${
                          reading.amount > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-400 dark:text-slate-500"
                        }`}
                      >
                        {formatCurrency(reading.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-[#1E2D42] bg-gray-50 dark:bg-[#0B1222]">
                  <td colSpan={5} className="p-4 text-right font-bold text-gray-900 dark:text-white">
                    Totals:
                  </td>
                  <td className="p-4 font-bold text-amber-600 dark:text-amber-400 font-mono">
                    {totalUnits.toFixed(1)}
                  </td>
                  <td className="p-4 font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
