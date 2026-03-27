"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useToast } from "@/components/providers";
import {
  ArrowRight,
  ArrowLeftRight,
  User,
  BedDouble,
  Search,
  History,
  CheckCircle2,
} from "lucide-react";

interface Resident {
  id: string;
  name: string;
  roomNumber: string;
  bedId: string;
  bedNumber: string;
}

interface VacantBed {
  id: string;
  bedNumber: string;
  roomNumber: string;
  floor: string;
  building: string;
  label: string;
}

interface Transfer {
  id: string;
  date: string;
  reason: string | null;
  residentName: string;
  fromRoom: string;
  fromBed: string;
  toRoom: string;
  toBed: string;
}

export default function RoomTransferPage() {
  const params = useParams();
  const hostelId = params.id as string;
  const { addToast } = useToast();

  const [residents, setResidents] = useState<Resident[]>([]);
  const [vacantBeds, setVacantBeds] = useState<VacantBed[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedResident, setSelectedResident] = useState("");
  const [selectedBed, setSelectedBed] = useState("");
  const [reason, setReason] = useState("");
  const [residentSearch, setResidentSearch] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/hostels/${hostelId}/room-transfer`);
      if (res.ok) {
        const data = await res.json();
        setResidents(data.residents || []);
        setVacantBeds(data.vacantBeds || []);
        setTransfers(data.transfers || []);
      }
    } catch {
      addToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [hostelId]);

  const selectedResidentData = residents.find((r) => r.id === selectedResident);

  const filteredResidents = residentSearch
    ? residents.filter(
        (r) =>
          r.name.toLowerCase().includes(residentSearch.toLowerCase()) ||
          r.roomNumber.includes(residentSearch)
      )
    : residents;

  const handleTransfer = async () => {
    if (!selectedResident || !selectedBed) {
      addToast("Select both resident and destination bed", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/hostels/${hostelId}/room-transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          residentId: selectedResident,
          newBedId: selectedBed,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Transfer failed", "error");
        return;
      }

      addToast(data.message || "Transfer successful!", "success");
      setSelectedResident("");
      setSelectedBed("");
      setReason("");
      fetchData();
    } catch {
      addToast("Transfer failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Room Transfer" hostelId={hostelId}>
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Room Transfer" hostelId={hostelId}>
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Room Transfer</h1>
          <p className="text-sm text-text-muted mt-1">
            Move a resident from one bed to another
          </p>
        </div>

        {/* Transfer Form */}
        <div className="card animate-fade-in-up">
          <h2 className="section-title mb-6">New Transfer</h2>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-6 items-start">
            {/* FROM - Select Resident */}
            <div>
              <label className="label">Select Resident</label>
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={residentSearch}
                  onChange={(e) => setResidentSearch(e.target.value)}
                  placeholder="Search by name or room..."
                  className="input pl-9"
                />
              </div>

              <div className="max-h-[250px] overflow-y-auto space-y-1.5 border border-border dark:border-[#1E2D42] rounded-xl p-2">
                {filteredResidents.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-4">No residents found</p>
                ) : (
                  filteredResidents.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedResident(r.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                        selectedResident === r.id
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-gray-50 dark:hover:bg-[#0B1222] border border-transparent"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary dark:text-white truncate">{r.name}</p>
                        <p className="text-xs text-text-muted">Room {r.roomNumber} • {r.bedNumber}</p>
                      </div>
                      {selectedResident === r.id && (
                        <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Current assignment */}
              {selectedResidentData && (
                <div className="mt-3 p-3 bg-danger-light dark:bg-red-900/10 rounded-xl">
                  <p className="text-xs font-semibold text-danger mb-1">Current Location</p>
                  <p className="text-sm font-medium text-text-primary dark:text-white">
                    Room {selectedResidentData.roomNumber} → {selectedResidentData.bedNumber}
                  </p>
                </div>
              )}
            </div>

            {/* Arrow */}
            <div className="hidden lg:flex items-center justify-center pt-20">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ArrowRight size={28} className="text-primary" />
              </div>
            </div>
            <div className="flex lg:hidden items-center justify-center">
              <ArrowLeftRight size={24} className="text-primary" />
            </div>

            {/* TO - Select Destination Bed */}
            <div>
              <label className="label">Destination Bed</label>
              <select
                value={selectedBed}
                onChange={(e) => setSelectedBed(e.target.value)}
                className="select mb-3"
              >
                <option value="">Choose a vacant bed...</option>
                {vacantBeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>

              {selectedBed && (
                <div className="p-3 bg-success-light dark:bg-emerald-900/10 rounded-xl">
                  <p className="text-xs font-semibold text-success mb-1">New Location</p>
                  <p className="text-sm font-medium text-text-primary dark:text-white">
                    {vacantBeds.find((b) => b.id === selectedBed)?.label}
                  </p>
                </div>
              )}

              <div className="mt-3">
                <label className="label">Reason (optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is the resident being transferred?"
                  className="textarea dark:bg-[#0B1222] dark:border-[#1E2D42] dark:text-white"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Transfer Button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleTransfer}
              disabled={!selectedResident || !selectedBed || submitting}
              className="btn-primary px-8 py-3 text-base disabled:opacity-40"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Transferring...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ArrowLeftRight size={18} />
                  Transfer Resident
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Transfer History */}
        <div className="card animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center gap-2 mb-4">
            <History size={20} className="text-primary" />
            <h2 className="section-title">Transfer History</h2>
          </div>

          {transfers.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">
              <ArrowLeftRight size={32} className="mx-auto mb-2 opacity-30" />
              No transfers recorded yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Resident</th>
                    <th className="table-header">From</th>
                    <th className="table-header">To</th>
                    <th className="table-header">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => (
                    <tr key={t.id} className="table-row">
                      <td className="table-cell text-sm">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="table-cell font-medium">{t.residentName}</td>
                      <td className="table-cell">
                        <span className="text-sm text-danger">{t.fromRoom} • {t.fromBed}</span>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-success">{t.toRoom} • {t.toBed}</span>
                      </td>
                      <td className="table-cell text-sm text-text-muted">
                        {t.reason || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
