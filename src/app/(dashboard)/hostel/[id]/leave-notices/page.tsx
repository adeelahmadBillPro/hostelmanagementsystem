"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/ui/stat-card";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/providers";
import { formatDate } from "@/lib/utils";
import {
  LogOut, Clock, CheckCircle2, XCircle, Calendar,
  User, DoorOpen, AlertTriangle, Loader2, RefreshCw,
  GraduationCap, Briefcase, Home, Heart, Wallet,
  Building, HelpCircle, CheckCheck,
} from "lucide-react";

const REASONS: Record<string, { label: string; icon: any; color: string }> = {
  DEGREE_COMPLETION: { label: "Degree Completed",        icon: GraduationCap, color: "#6366F1" },
  JOB_CHANGE:        { label: "Job Change / Transfer",   icon: Briefcase,     color: "#3B82F6" },
  FAMILY_RELOCATION: { label: "Family Relocation",       icon: Home,          color: "#10B981" },
  MARRIAGE:          { label: "Marriage",                 icon: Heart,         color: "#EC4899" },
  FINANCIAL:         { label: "Financial Reasons",        icon: Wallet,        color: "#F59E0B" },
  HOSTEL_TRANSFER:   { label: "Hostel Transfer",          icon: Building,      color: "#8B5CF6" },
  OTHER:             { label: "Other",                    icon: HelpCircle,    color: "#6B7280" },
};

interface LeaveNotice {
  id: string;
  type: string;
  reason: string;
  description: string | null;
  lastDay: string;
  status: "PENDING" | "ACKNOWLEDGED" | "COMPLETED";
  createdAt: string;
  user: { name: string; email: string; phone: string | null };
  resident: {
    room: { roomNumber: string } | null;
    bed: { bedNumber: string } | null;
  } | null;
  acknowledgedBy: { name: string } | null;
}

type FilterTab = "ALL" | "PENDING" | "ACKNOWLEDGED" | "COMPLETED";

export default function LeaveNoticesPage() {
  const params   = useParams();
  const hostelId = params.id as string;
  const { addToast } = useToast();

  const [notices, setNotices]     = useState<LeaveNotice[]>([]);
  const [stats, setStats]         = useState({ total: 0, pending: 0, acknowledged: 0, upcoming: 0 });
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<FilterTab>("ALL");
  const [selected, setSelected]   = useState<LeaveNotice | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hostels/${hostelId}/leave-notices`);
      if (res.ok) {
        const data = await res.json();
        setNotices(data.notices || []);
        setStats(data.stats || { total: 0, pending: 0, acknowledged: 0, upcoming: 0 });
      }
    } catch {
      addToast("Failed to load leave notices", "error");
    } finally {
      setLoading(false);
    }
  }, [hostelId, addToast]);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  const handleAction = async (noticeId: string, action: "acknowledge" | "complete") => {
    if (action === "complete") {
      const notice = notices.find((n) => n.id === noticeId);
      const msg = notice?.resident
        ? `Mark as completed and automatically check out ${notice.user.name}? Their bed will be freed.`
        : `Mark this leave notice as completed?`;
      if (!confirm(msg)) return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/hostels/${hostelId}/leave-notices`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noticeId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        const verb = action === "acknowledge" ? "acknowledged" : "completed";
        const extra = data.checkedOut ? " — resident has been checked out and bed freed." : "";
        addToast(`Leave notice ${verb}${extra}`, "success");
        setSelected(null);
        fetchNotices();
      } else {
        addToast(data.error || `Failed to ${action}`, "error");
      }
    } catch {
      addToast("Something went wrong", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = tab === "ALL" ? notices : notices.filter((n) => n.status === tab);

  const getDaysLeft = (lastDay: string) => {
    const diff = Math.ceil((new Date(lastDay).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0)   return { text: "Overdue", color: "text-red-500" };
    if (diff === 0) return { text: "Today",   color: "text-red-500" };
    if (diff <= 3)  return { text: `${diff}d left`, color: "text-amber-500" };
    if (diff <= 7)  return { text: `${diff}d left`, color: "text-yellow-500" };
    return { text: `${diff} days`, color: "text-text-muted dark:text-slate-400" };
  };

  const getStatusBadge = (status: string) => {
    if (status === "PENDING")
      return <span className="badge-warning inline-flex items-center gap-1"><Clock size={12} /> Pending</span>;
    if (status === "ACKNOWLEDGED")
      return <span className="badge-success inline-flex items-center gap-1"><CheckCircle2 size={12} /> Acknowledged</span>;
    if (status === "COMPLETED")
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"><XCircle size={12} /> Completed</span>;
    return null;
  };

  const TABS: { key: FilterTab; label: string; count?: number }[] = [
    { key: "ALL",          label: "All",          count: stats.total },
    { key: "PENDING",      label: "Pending",       count: stats.pending },
    { key: "ACKNOWLEDGED", label: "Acknowledged",  count: stats.acknowledged },
    { key: "COMPLETED",    label: "Completed" },
  ];

  return (
    <DashboardLayout title="Leave Notices" hostelId={hostelId}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-white flex items-center gap-2">
              <LogOut size={24} className="text-primary" />
              Leave Notices
            </h2>
            <p className="text-text-muted dark:text-slate-400 mt-1">
              Residents and staff who have submitted departure notices
            </p>
          </div>
          <button onClick={fetchNotices} disabled={loading} className="btn-secondary flex items-center gap-2 self-start sm:self-auto">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Notices"  value={stats.total}        icon={LogOut}       iconColor="#6366F1" delay={0} />
          <StatCard label="Pending Review" value={stats.pending}      icon={Clock}        iconColor="#F59E0B" delay={100} />
          <StatCard label="Acknowledged"   value={stats.acknowledged} icon={CheckCircle2} iconColor="#22C55E" delay={200} />
          <StatCard label="Due This Week"  value={stats.upcoming}     icon={AlertTriangle} iconColor="#EF4444" delay={300} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-bg-main dark:bg-[#0B1222] p-1 rounded-xl border border-border dark:border-[#1E2D42] w-full overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                tab === t.key
                  ? "bg-white dark:bg-[#111C2E] text-text-primary dark:text-white shadow-sm"
                  : "text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white"
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  t.key === "PENDING" ? "bg-amber-500 text-white" : "bg-primary/10 text-primary"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <LogOut size={40} className="text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-muted dark:text-slate-400">No leave notices found</p>
          </div>
        ) : (
          <div className="card overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#1E2D42]">
                  {["Name / Type", "Reason", "Last Day", "Room", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((notice, idx) => {
                  const reasonInfo = REASONS[notice.reason];
                  const Icon = reasonInfo?.icon || HelpCircle;
                  const daysLeft = getDaysLeft(notice.lastDay);
                  return (
                    <tr
                      key={notice.id}
                      className="border-b border-gray-100 dark:border-[#1E2D42] hover:bg-gray-50 dark:hover:bg-[#111C2E] transition-colors animate-fade-in"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User size={16} className="text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text-primary dark:text-white">{notice.user.name}</p>
                            <p className="text-xs text-text-muted dark:text-slate-400">{notice.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${reasonInfo?.color || "#666"}18` }}>
                            <Icon size={14} style={{ color: reasonInfo?.color || "#666" }} />
                          </div>
                          <span className="text-sm text-text-primary dark:text-white">
                            {reasonInfo?.label || notice.reason}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-semibold text-text-primary dark:text-white">
                          {new Date(notice.lastDay).toLocaleDateString("en-PK", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </p>
                        <p className={`text-xs font-medium ${daysLeft.color}`}>{daysLeft.text}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-text-primary dark:text-white">
                          {notice.resident?.room?.roomNumber || "—"}
                        </span>
                      </td>
                      <td className="p-4">{getStatusBadge(notice.status)}</td>
                      <td className="p-4">
                        <button
                          onClick={() => setSelected(notice)}
                          className="btn-secondary text-xs px-3 py-1.5"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => !actionLoading && setSelected(null)} title="Leave Notice Details">
        {selected && (() => {
          const reasonInfo = REASONS[selected.reason];
          const Icon = reasonInfo?.icon || HelpCircle;
          const daysLeft = getDaysLeft(selected.lastDay);
          return (
            <div className="space-y-5">
              {/* Person */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-bg-main dark:bg-[#0B1222] border border-border dark:border-[#1E2D42]">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User size={22} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary dark:text-white">{selected.user.name}</p>
                  <p className="text-sm text-text-muted dark:text-slate-400">{selected.user.email}</p>
                  {selected.user.phone && <p className="text-sm text-text-muted dark:text-slate-400">{selected.user.phone}</p>}
                  <p className="text-xs text-text-muted dark:text-slate-500 mt-0.5">{selected.type}</p>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-bg-main dark:bg-[#0B1222] border border-border dark:border-[#1E2D42]">
                  <p className="text-xs text-text-muted dark:text-slate-400 mb-1">Reason</p>
                  <div className="flex items-center gap-2">
                    <Icon size={15} style={{ color: reasonInfo?.color }} />
                    <span className="text-sm font-medium text-text-primary dark:text-white">
                      {reasonInfo?.label || selected.reason}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-bg-main dark:bg-[#0B1222] border border-border dark:border-[#1E2D42]">
                  <p className="text-xs text-text-muted dark:text-slate-400 mb-1">Last Day</p>
                  <p className="text-sm font-semibold text-text-primary dark:text-white">
                    {new Date(selected.lastDay).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <p className={`text-xs font-medium mt-0.5 ${daysLeft.color}`}>{daysLeft.text}</p>
                </div>
                {selected.resident?.room && (
                  <div className="p-3 rounded-xl bg-bg-main dark:bg-[#0B1222] border border-border dark:border-[#1E2D42]">
                    <p className="text-xs text-text-muted dark:text-slate-400 mb-1">Room</p>
                    <div className="flex items-center gap-2">
                      <DoorOpen size={15} className="text-primary" />
                      <span className="text-sm font-medium text-text-primary dark:text-white">
                        {selected.resident.room.roomNumber}
                        {selected.resident.bed && ` / Bed ${selected.resident.bed.bedNumber}`}
                      </span>
                    </div>
                  </div>
                )}
                <div className="p-3 rounded-xl bg-bg-main dark:bg-[#0B1222] border border-border dark:border-[#1E2D42]">
                  <p className="text-xs text-text-muted dark:text-slate-400 mb-1">Status</p>
                  {getStatusBadge(selected.status)}
                </div>
              </div>

              {selected.description && (
                <div className="p-4 rounded-xl bg-bg-main dark:bg-[#0B1222] border border-border dark:border-[#1E2D42]">
                  <p className="text-xs text-text-muted dark:text-slate-400 mb-1">Note from person</p>
                  <p className="text-sm text-text-primary dark:text-white italic">&quot;{selected.description}&quot;</p>
                </div>
              )}

              {selected.acknowledgedBy && (
                <p className="text-xs text-text-muted dark:text-slate-400">
                  Acknowledged by: <span className="font-medium">{selected.acknowledgedBy.name}</span>
                </p>
              )}

              {/* Actions */}
              {selected.status === "PENDING" && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleAction(selected.id, "acknowledge")}
                    disabled={actionLoading}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Acknowledge
                  </button>
                </div>
              )}
              {selected.status === "ACKNOWLEDGED" && (
                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                    <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {selected.resident
                        ? "Marking as complete will automatically check out the resident and free their bed."
                        : "This will mark the leave notice as fully completed."}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAction(selected.id, "complete")}
                    disabled={actionLoading}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />}
                    Mark Complete & {selected.resident ? "Checkout Resident" : "Close"}
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </DashboardLayout>
  );
}
