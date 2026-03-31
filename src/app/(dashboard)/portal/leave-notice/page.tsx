'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useToast } from '@/components/providers';
import { formatDate } from '@/lib/utils';
import {
  LogOut,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  Send,
  Trash2,
  GraduationCap,
  Briefcase,
  Home,
  Heart,
  Wallet,
  Building,
  HelpCircle,
} from 'lucide-react';

interface LeaveNotice {
  id: string;
  reason: string;
  lastDay: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface FormErrors {
  reason?: string;
  lastDay?: string;
}

const REASONS = [
  { value: 'DEGREE_COMPLETION', label: 'Degree Completion', icon: GraduationCap, color: '#6366F1' },
  { value: 'JOB_CHANGE', label: 'Job Change', icon: Briefcase, color: '#3B82F6' },
  { value: 'FAMILY_RELOCATION', label: 'Family Relocation', icon: Home, color: '#10B981' },
  { value: 'MARRIAGE', label: 'Marriage', icon: Heart, color: '#EC4899' },
  { value: 'FINANCIAL', label: 'Financial', icon: Wallet, color: '#F59E0B' },
  { value: 'HOSTEL_TRANSFER', label: 'Hostel Transfer', icon: Building, color: '#8B5CF6' },
  { value: 'OTHER', label: 'Other', icon: HelpCircle, color: '#6B7280' },
];

export default function LeaveNoticePage() {
  const { addToast } = useToast();
  const [notices, setNotices] = useState<LeaveNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [lastDay, setLastDay] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const activePending = notices.find(
    (n) => n.status === 'PENDING' || n.status === 'ACKNOWLEDGED'
  );

  const minDate = (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  })();

  const fetchNotices = async () => {
    try {
      const res = await fetch('/api/portal/leave-notice');
      if (res.ok) {
        const data = await res.json();
        setNotices(data.notices || []);
      }
    } catch (error) {
      console.error('Failed to fetch leave notices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!reason) newErrors.reason = 'Please select a reason';
    if (!lastDay) {
      newErrors.lastDay = 'Please select your last day';
    } else if (new Date(lastDay) <= new Date()) {
      newErrors.lastDay = 'Last day must be a future date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/portal/leave-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, lastDay, description }),
      });
      if (res.ok) {
        addToast('Leave notice submitted successfully', 'success');
        setReason('');
        setLastDay('');
        setDescription('');
        setErrors({});
        await fetchNotices();
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to submit leave notice', 'error');
      }
    } catch (error) {
      console.error('Failed to submit leave notice:', error);
      addToast('Something went wrong', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (noticeId: string) => {
    if (!confirm('Are you sure you want to cancel this leave notice?')) return;
    setCancelling(noticeId);
    try {
      const res = await fetch(`/api/portal/leave-notice?noticeId=${noticeId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        addToast('Leave notice cancelled', 'success');
        await fetchNotices();
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to cancel leave notice', 'error');
      }
    } catch (error) {
      console.error('Failed to cancel leave notice:', error);
      addToast('Something went wrong', 'error');
    } finally {
      setCancelling(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="badge badge-warning flex items-center gap-1">
            <Clock size={14} /> Pending Review
          </span>
        );
      case 'ACKNOWLEDGED':
        return (
          <span className="badge badge-success flex items-center gap-1">
            <CheckCircle2 size={14} /> Acknowledged
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="badge bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300 flex items-center gap-1">
            <XCircle size={14} /> Completed
          </span>
        );
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const getDaysLeft = (dateStr: string) => {
    const target = new Date(dateStr);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Passed';
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `${diff} days left`;
  };

  const getReasonInfo = (value: string) =>
    REASONS.find((r) => r.value === value) || REASONS[REASONS.length - 1];

  return (
    <DashboardLayout title="Leave Notice" hostelId="">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <LogOut size={28} className="text-red-500" />
          <h1 className="page-title">Leave Notice</h1>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500 dark:text-slate-400">
            <Loader2 size={32} className="mx-auto mb-3 animate-spin" />
            <p>Loading leave notices...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form or Active Notice */}
            <div className="lg:col-span-2 space-y-4">
              {activePending ? (
                <>
                  {/* Active Notice Warning */}
                  <div className="card border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-300">
                          Active Leave Notice
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                          You already have a pending leave notice. You can cancel it to submit a new one.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Active Notice Details */}
                  <div className="card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Current Notice
                      </h2>
                      {getStatusBadge(activePending.status)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Reason</p>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const info = getReasonInfo(activePending.reason);
                            const Icon = info.icon;
                            return (
                              <>
                                <Icon size={16} style={{ color: info.color }} />
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {info.label}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Last Day</p>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatDate(activePending.lastDay)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            ({getDaysLeft(activePending.lastDay)})
                          </span>
                        </div>
                      </div>
                    </div>

                    {activePending.description && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Description</p>
                        <p className="text-sm text-gray-700 dark:text-slate-300">
                          {activePending.description}
                        </p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Submitted on {formatDate(activePending.createdAt)}
                      </p>
                    </div>

                    {activePending.status === 'PENDING' && (
                      <button
                        onClick={() => handleCancel(activePending.id)}
                        disabled={cancelling === activePending.id}
                        className="btn-secondary flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        {cancelling === activePending.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                        Cancel Leave Notice
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* Submit Form */
                <form onSubmit={handleSubmit} className="card p-6 space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Submit Leave Notice
                    </h2>
                  </div>

                  {/* Reason Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Reason for Leaving <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {REASONS.map((r) => {
                        const Icon = r.icon;
                        const selected = reason === r.value;
                        return (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => {
                              setReason(r.value);
                              setErrors((prev) => ({ ...prev, reason: undefined }));
                            }}
                            className={`flex items-center gap-2 p-3 rounded-lg border text-left text-sm transition-all ${
                              selected
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                                : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                            }`}
                          >
                            <Icon
                              size={18}
                              style={{ color: r.color }}
                              className="flex-shrink-0"
                            />
                            <span
                              className={`font-medium ${
                                selected
                                  ? 'text-indigo-700 dark:text-indigo-300'
                                  : 'text-gray-700 dark:text-slate-300'
                              }`}
                            >
                              {r.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.reason && (
                      <p className="text-xs text-red-500 mt-1">{errors.reason}</p>
                    )}
                  </div>

                  {/* Last Day */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Last Day at Hostel <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="date"
                        value={lastDay}
                        min={minDate}
                        onChange={(e) => {
                          setLastDay(e.target.value);
                          setErrors((prev) => ({ ...prev, lastDay: undefined }));
                        }}
                        className="input pl-10 w-full"
                      />
                    </div>
                    {errors.lastDay && (
                      <p className="text-xs text-red-500 mt-1">{errors.lastDay}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Additional Details (Optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={400}
                      rows={3}
                      placeholder="Any additional information about your departure..."
                      className="input w-full resize-none"
                    />
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 text-right">
                      {description.length}/400
                    </p>
                  </div>

                  {/* Info Box */}
                  <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <AlertTriangle size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Your hostel admin and manager will be notified about this leave notice.
                      Please ensure all dues are cleared before your last day.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    {submitting ? 'Submitting...' : 'Submit Leave Notice'}
                  </button>
                </form>
              )}
            </div>

            {/* Right Column - Notice History */}
            <div className="lg:col-span-1">
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-gray-400" />
                  Notice History
                </h3>

                {notices.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                    <LogOut size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No notices yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notices.map((notice) => {
                      const info = getReasonInfo(notice.reason);
                      const Icon = info.icon;
                      return (
                        <div
                          key={notice.id}
                          className="border border-gray-100 dark:border-slate-700 rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon size={14} style={{ color: info.color }} />
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {info.label}
                              </span>
                            </div>
                            {getStatusBadge(notice.status)}
                          </div>

                          <div className="text-xs text-gray-500 dark:text-slate-400 space-y-1">
                            <p className="flex items-center gap-1">
                              <Calendar size={12} />
                              Last day: {formatDate(notice.lastDay)}
                              <span className="text-gray-400">
                                ({getDaysLeft(notice.lastDay)})
                              </span>
                            </p>
                            <p>Submitted: {formatDate(notice.createdAt)}</p>
                          </div>

                          {notice.status === 'PENDING' && (
                            <button
                              onClick={() => handleCancel(notice.id)}
                              disabled={cancelling === notice.id}
                              className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 flex items-center gap-1 mt-1"
                            >
                              {cancelling === notice.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Trash2 size={12} />
                              )}
                              Cancel
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
