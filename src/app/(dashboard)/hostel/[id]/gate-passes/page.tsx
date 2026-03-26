'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import StatCard from '@/components/ui/stat-card';
import DataTable from '@/components/ui/data-table';
import { formatDate } from '@/lib/utils';
import { Clock, CheckCircle, AlertTriangle, LogIn } from 'lucide-react';

interface GatePass {
  id: string;
  residentName: string;
  residentId: string;
  leaveDate: string;
  returnDate: string;
  actualReturn: string | null;
  reason: string;
  status: string;
}

const statusBadge: Record<string, string> = {
  PENDING: 'badge-warning',
  APPROVED: 'badge-success',
  REJECTED: 'badge-danger',
  ON_LEAVE: 'badge-primary',
  RETURNED: 'badge-success',
};

export default function GatePassesPage() {
  const params = useParams();
  const hostelId = params.id as string;

  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGatePasses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hostels/${hostelId}/gate-passes`);
      if (res.ok) {
        const data = await res.json();
        setGatePasses(data.gatePasses || []);
      }
    } catch (error) {
      console.error('Failed to fetch gate passes:', error);
    } finally {
      setLoading(false);
    }
  }, [hostelId]);

  useEffect(() => {
    fetchGatePasses();
  }, [fetchGatePasses]);

  const updateGatePass = async (gatePassId: string, action: string) => {
    try {
      const res = await fetch(`/api/hostels/${hostelId}/gate-passes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gatePassId, action }),
      });
      if (res.ok) {
        await fetchGatePasses();
      }
    } catch (error) {
      console.error('Failed to update gate pass:', error);
    }
  };

  const pendingCount = gatePasses.filter((g) => g.status === 'PENDING').length;
  const approvedCount = gatePasses.filter((g) => g.status === 'APPROVED' || g.status === 'ON_LEAVE').length;
  const onLeaveCount = gatePasses.filter((g) => g.status === 'ON_LEAVE').length;

  const columns = [
    {
      label: 'Resident',
      key: 'residentName' as keyof GatePass,
      render: (row: GatePass) => <span className="font-medium">{row.residentName}</span>,
    },
    {
      label: 'Leave Date',
      key: 'leaveDate' as keyof GatePass,
      render: (row: GatePass) => <span>{formatDate(row.leaveDate)}</span>,
    },
    {
      label: 'Return Date',
      key: 'returnDate' as keyof GatePass,
      render: (row: GatePass) => <span>{formatDate(row.returnDate)}</span>,
    },
    {
      label: 'Actual Return',
      key: 'actualReturn' as keyof GatePass,
      render: (row: GatePass) => (
        <span>{row.actualReturn ? formatDate(row.actualReturn) : '-'}</span>
      ),
    },
    {
      label: 'Reason',
      key: 'reason' as keyof GatePass,
      render: (row: GatePass) => (
        <span className="text-gray-600 text-sm max-w-xs truncate block">{row.reason}</span>
      ),
    },
    {
      label: 'Status',
      key: 'status' as keyof GatePass,
      render: (row: GatePass) => (
        <span className={statusBadge[row.status] || 'badge-primary'}>
          {row.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      label: 'Actions',
      key: 'id' as keyof GatePass,
      render: (row: GatePass) => (
        <div className="flex items-center gap-2">
          {row.status === 'PENDING' && (
            <>
              <button
                onClick={() => updateGatePass(row.id, 'APPROVE')}
                className="btn-success text-xs px-3 py-1"
              >
                Approve
              </button>
              <button
                onClick={() => updateGatePass(row.id, 'REJECT')}
                className="btn-danger text-xs px-3 py-1"
              >
                Reject
              </button>
            </>
          )}
          {(row.status === 'APPROVED' || row.status === 'ON_LEAVE') && !row.actualReturn && (
            <button
              onClick={() => updateGatePass(row.id, 'RETURN')}
              className="btn-primary text-xs px-3 py-1 flex items-center gap-1"
            >
              <LogIn size={14} />
              Mark Returned
            </button>
          )}
          {row.status === 'RETURNED' && (
            <span className="text-gray-400 text-sm">Completed</span>
          )}
          {row.status === 'REJECTED' && (
            <span className="text-gray-400 text-sm">Rejected</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Gate Passes" hostelId={hostelId}>
      <div className="space-y-6">
        <h1 className="page-title">Gate Passes</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Pending"
            value={pendingCount}
            icon={<Clock size={24} />}
            color="#F59E0B"
          />
          <StatCard
            title="Approved"
            value={approvedCount}
            icon={<CheckCircle size={24} />}
            color="#10B981"
          />
          <StatCard
            title="On Leave"
            value={onLeaveCount}
            icon={<AlertTriangle size={24} />}
            color="#4F46E5"
          />
        </div>

        <div className="card">
          <DataTable
            columns={columns}
            data={gatePasses}
            emptyMessage="No gate passes found"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
