"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useToast } from "@/components/providers";
import {
  CalendarDays,
  Save,
  Loader2,
  UserCheck,
  UserX,
  Clock,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";

interface StaffAttendanceRecord {
  id: string;
  name: string;
  staffType: string;
  shift: string;
  phone: string | null;
  photo: string | null;
  attendance: {
    id: string;
    status: string;
    checkIn: string | null;
    checkOut: string | null;
    notes: string | null;
  } | null;
}

interface AttendanceForm {
  staffId: string;
  status: string;
  checkIn: string;
  checkOut: string;
  notes: string;
}

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
  { value: "HALF_DAY", label: "Half Day" },
  { value: "LEAVE", label: "Leave" },
];

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  ABSENT: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  LATE: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  HALF_DAY: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  LEAVE: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const STAFF_TYPE_LABELS: Record<string, string> = {
  SECURITY: "Security",
  COOKING: "Cooking",
  LAUNDRY: "Laundry",
  CLEANING: "Cleaning",
  MAINTENANCE: "Maintenance",
  ADMIN_STAFF: "Admin",
  OTHER: "Other",
};

const SHIFT_LABELS: Record<string, string> = {
  DAY: "Day",
  NIGHT: "Night",
  FULL: "Full",
};

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function StaffAttendancePage() {
  const params = useParams();
  const hostelId = params.id as string;
  const { addToast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [staffList, setStaffList] = useState<StaffAttendanceRecord[]>([]);
  const [forms, setForms] = useState<Record<string, AttendanceForm>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const dateStr = formatDate(selectedDate);
      const res = await fetch(
        `/api/hostels/${hostelId}/staff/attendance?date=${dateStr}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStaffList(data.staff);

      // Initialize forms from fetched data
      const newForms: Record<string, AttendanceForm> = {};
      data.staff.forEach((s: StaffAttendanceRecord) => {
        newForms[s.id] = {
          staffId: s.id,
          status: s.attendance?.status || "PRESENT",
          checkIn: s.attendance?.checkIn || "",
          checkOut: s.attendance?.checkOut || "",
          notes: s.attendance?.notes || "",
        };
      });
      setForms(newForms);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      addToast("Failed to load attendance data", "error");
    } finally {
      setLoading(false);
    }
  }, [hostelId, selectedDate, addToast]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const updateForm = (staffId: string, field: string, value: string) => {
    setForms((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], [field]: value },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const records = Object.values(forms);
      const res = await fetch(`/api/hostels/${hostelId}/staff/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formatDate(selectedDate),
          records,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      const data = await res.json();
      addToast(data.message, "success");
      // Refresh to get updated IDs
      fetchAttendance();
    } catch (error: any) {
      console.error("Save error:", error);
      addToast(error.message || "Failed to save attendance", "error");
    } finally {
      setSaving(false);
    }
  };

  const navigateDate = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Stats
  const presentCount = Object.values(forms).filter(
    (f) => f.status === "PRESENT"
  ).length;
  const absentCount = Object.values(forms).filter(
    (f) => f.status === "ABSENT"
  ).length;
  const lateCount = Object.values(forms).filter(
    (f) => f.status === "LATE"
  ).length;
  const halfDayCount = Object.values(forms).filter(
    (f) => f.status === "HALF_DAY"
  ).length;
  const leaveCount = Object.values(forms).filter(
    (f) => f.status === "LEAVE"
  ).length;
  const totalStaff = staffList.length;

  const isToday = formatDate(selectedDate) === formatDate(new Date());

  return (
    <DashboardLayout title="Staff Attendance" hostelId={hostelId}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary dark:text-white flex items-center gap-2">
            <CalendarDays size={24} className="text-primary" />
            Staff Attendance
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Mark daily attendance for all active staff members
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading || totalStaff === 0}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={14} />
              Save Attendance
            </>
          )}
        </button>
      </div>

      {/* Date Picker */}
      <div className="card mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateDate(-1)}
              className="p-2 rounded-lg bg-bg-main dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={formatDate(selectedDate)}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="input-field text-sm"
              />
              <span className="text-sm font-medium text-text-primary dark:text-white hidden sm:inline">
                {formatDisplayDate(selectedDate)}
              </span>
            </div>

            <button
              onClick={() => navigateDate(1)}
              className="p-2 rounded-lg bg-bg-main dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {!isToday && (
            <button
              onClick={goToToday}
              className="text-xs font-medium text-primary hover:text-primary-dark transition-colors"
            >
              Go to Today
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {!loading && totalStaff > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="card text-center animate-fade-in">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Users size={14} className="text-primary" />
              <span className="text-xs text-text-muted">Total</span>
            </div>
            <p className="text-2xl font-bold text-text-primary dark:text-white">
              {totalStaff}
            </p>
          </div>
          <div className="card text-center animate-fade-in" style={{ animationDelay: "50ms" }}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <UserCheck size={14} className="text-emerald-500" />
              <span className="text-xs text-text-muted">Present</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {presentCount}
            </p>
          </div>
          <div className="card text-center animate-fade-in" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <UserX size={14} className="text-red-500" />
              <span className="text-xs text-text-muted">Absent</span>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {absentCount}
            </p>
          </div>
          <div className="card text-center animate-fade-in" style={{ animationDelay: "150ms" }}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Clock size={14} className="text-amber-500" />
              <span className="text-xs text-text-muted">Late</span>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {lateCount}
            </p>
          </div>
          <div className="card text-center animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Clock size={14} className="text-blue-500" />
              <span className="text-xs text-text-muted">Half Day</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {halfDayCount}
            </p>
          </div>
          <div className="card text-center animate-fade-in" style={{ animationDelay: "250ms" }}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <CalendarDays size={14} className="text-gray-500" />
              <span className="text-xs text-text-muted">Leave</span>
            </div>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {leaveCount}
            </p>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : totalStaff === 0 ? (
        <div className="card p-12 text-center animate-fade-in">
          <Users size={48} className="mx-auto mb-4 text-text-muted opacity-40" />
          <p className="text-text-muted mb-2">No active staff members found.</p>
          <p className="text-xs text-text-muted">
            Add staff members from the Staff page first.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block card !p-0 overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-bg-main dark:bg-[#111C2E] border-b border-border dark:border-white/10">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                      #
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                      Shift
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider min-w-[140px]">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                      Check In
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                      Check Out
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((staff, idx) => {
                    const form = forms[staff.id];
                    if (!form) return null;

                    return (
                      <tr
                        key={staff.id}
                        className={`transition-colors hover:bg-bg-main/50 dark:hover:bg-white/[0.02] ${
                          idx !== staffList.length - 1
                            ? "border-b border-border dark:border-white/5"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-text-muted">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {staff.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-text-primary dark:text-white">
                                {staff.name}
                              </p>
                              {staff.phone && (
                                <p className="text-xs text-text-muted">{staff.phone}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-bg-main dark:bg-white/5 text-text-secondary dark:text-gray-400">
                            {STAFF_TYPE_LABELS[staff.staffType] || staff.staffType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-text-muted">
                            {SHIFT_LABELS[staff.shift] || staff.shift}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={form.status}
                            onChange={(e) =>
                              updateForm(staff.id, "status", e.target.value)
                            }
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border-0 cursor-pointer focus:ring-2 focus:ring-primary/30 ${STATUS_COLORS[form.status]}`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="time"
                            value={form.checkIn}
                            onChange={(e) =>
                              updateForm(staff.id, "checkIn", e.target.value)
                            }
                            className="input-field text-xs !py-1.5 !px-2 w-28"
                            disabled={
                              form.status === "ABSENT" || form.status === "LEAVE"
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="time"
                            value={form.checkOut}
                            onChange={(e) =>
                              updateForm(staff.id, "checkOut", e.target.value)
                            }
                            className="input-field text-xs !py-1.5 !px-2 w-28"
                            disabled={
                              form.status === "ABSENT" || form.status === "LEAVE"
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={form.notes}
                            onChange={(e) =>
                              updateForm(staff.id, "notes", e.target.value)
                            }
                            placeholder="Optional note..."
                            className="input-field text-xs !py-1.5 !px-2 w-36"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {staffList.map((staff, idx) => {
              const form = forms[staff.id];
              if (!form) return null;

              return (
                <div
                  key={staff.id}
                  className="card animate-fade-in-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                        {staff.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary dark:text-white">
                          {staff.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-bg-main dark:bg-white/5 text-text-muted">
                            {STAFF_TYPE_LABELS[staff.staffType] || staff.staffType}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {SHIFT_LABELS[staff.shift]} shift
                          </span>
                        </div>
                      </div>
                    </div>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        updateForm(staff.id, "status", e.target.value)
                      }
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border-0 cursor-pointer ${STATUS_COLORS[form.status]}`}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {form.status !== "ABSENT" && form.status !== "LEAVE" && (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-[10px] text-text-muted uppercase tracking-wider">
                          Check In
                        </label>
                        <input
                          type="time"
                          value={form.checkIn}
                          onChange={(e) =>
                            updateForm(staff.id, "checkIn", e.target.value)
                          }
                          className="input-field text-xs !py-1.5 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-text-muted uppercase tracking-wider">
                          Check Out
                        </label>
                        <input
                          type="time"
                          value={form.checkOut}
                          onChange={(e) =>
                            updateForm(staff.id, "checkOut", e.target.value)
                          }
                          className="input-field text-xs !py-1.5 w-full"
                        />
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) =>
                      updateForm(staff.id, "notes", e.target.value)
                    }
                    placeholder="Add a note..."
                    className="input-field text-xs !py-1.5 w-full"
                  />
                </div>
              );
            })}
          </div>

          {/* Mobile Save Button */}
          <div className="md:hidden mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Attendance
                </>
              )}
            </button>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
