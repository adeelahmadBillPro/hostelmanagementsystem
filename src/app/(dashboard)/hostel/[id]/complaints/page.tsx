'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import StatCard from '@/components/ui/stat-card';
import { formatDate } from '@/lib/utils';
import { AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Complaint {
  id: string;
  category: string;
  description: string;
  residentName: string;
  residentId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_TABS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const statusBadge: Record<string, string> = {
  OPEN: 'badge-danger',
  IN_PROGRESS: 'badge-warning',
  RESOLVED: 'badge-success',
  CLOSED: 'badge-primary',
};

const statusIcon: Record<string, React.ReactNode> = {
  OPEN: <AlertCircle size={16} />,
  IN_PROGRESS: <Clock size={16} />,
  RESOLVED: <CheckCircle size={16} />,
  CLOSED: <XCircle size={16} />,
};

export default function ComplaintsPage() {
  const params = useParams();
  const hostelId = params.id as string;

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const query = activeTab !== 'ALL' ? `?status=${activeTab}` : '';
      const res = await fetch(`/api/hostels/${hostelId}/complaints${query}`);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
      }
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    } finally {
      setLoading(false);
    }
  }, [hostelId, activeTab]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const updateStatus = async (complaintId: string, status: string) => {
    try {
      const res = await fetch(`/api/hostels/${hostelId}/complaints`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintId, status }),
      });
      if (res.ok) {
        setComplaints((prev) =>
          prev.map((c) => (c.id === complaintId ? { ...c, status } : c))
        );
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getNextStatuses = (currentStatus: string): string[] => {
    switch (currentStatus) {
      case 'OPEN':
        return ['IN_PROGRESS', 'RESOLVED', 'CLOSED'];
      case 'IN_PROGRESS':
        return ['RESOLVED', 'CLOSED'];
      case 'RESOLVED':
        return ['CLOSED'];
      default:
        return [];
    }
  };

  const openCount = complaints.filter((c) => c.status === 'OPEN').length;
  const inProgressCount = complaints.filter((c) => c.status === 'IN_PROGRESS').length;
  const resolvedCount = complaints.filter((c) => c.status === 'RESOLVED').length;

  return (
    <DashboardLayout title="Complaints" hostelId={hostelId}>
      <div className="space-y-6">
        <h1 className="page-title">Complaints Management</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Open"
            value={openCount}
            icon={<AlertCircle size={24} />}
            color="#EF4444"
          />
          <StatCard
            title="In Progress"
            value={inProgressCount}
            icon={<Clock size={24} />}
            color="#F59E0B"
          />
          <StatCard
            title="Resolved"
            value={resolvedCount}
            icon={<CheckCircle size={24} />}
            color="#10B981"
          />
        </div>

        {/* Status Filter Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-2 border-b sm:border-b-0 pb-2 sm:pb-0 overflow-x-auto flex-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-shrink-0 whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-primary text-white'
                    : 'bg-bg-main dark:bg-[#0B1222] text-text-secondary hover:bg-gray-200 dark:hover:bg-[#111C2E]'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="relative flex-shrink-0 sm:w-56">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search resident, category..."
              className="input w-full !h-9 !text-xs pl-8"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        {/* Complaints Cards */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading complaints...</div>
        ) : complaints.filter(c => !search || c.residentName?.toLowerCase().includes(search.toLowerCase()) || c.category?.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
          <div className="text-center py-12 text-gray-500">{search ? `No complaints found for "${search}"` : "No complaints found"}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {complaints.filter(c => !search || c.residentName?.toLowerCase().includes(search.toLowerCase()) || c.category?.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase())).map((complaint) => (
              <div key={complaint.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <span className="badge-primary text-xs">{complaint.category}</span>
                  <span className={`${statusBadge[complaint.status]} flex items-center gap-1`}>
                    {statusIcon[complaint.status]}
                    {complaint.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-gray-700 text-sm mb-3 line-clamp-3">
                  {complaint.description}
                </p>

                <div className="text-xs text-gray-500 space-y-1 mb-4">
                  <p>
                    <span className="font-medium">By:</span> {complaint.residentName}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span> {formatDate(complaint.createdAt)}
                  </p>
                </div>

                {getNextStatuses(complaint.status).length > 0 && (
                  <div className="pt-3 border-t">
                    <label className="label text-xs">Update Status</label>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          updateStatus(complaint.id, e.target.value);
                        }
                      }}
                      className="select text-sm"
                    >
                      <option value="">Change status...</option>
                      {getNextStatuses(complaint.status).map((s) => (
                        <option key={s} value={s}>
                          {s.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
