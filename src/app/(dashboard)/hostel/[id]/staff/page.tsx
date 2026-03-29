'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import StatCard from '@/components/ui/stat-card';
import DataTable from '@/components/ui/data-table';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Users, UserCheck, DollarSign, Plus, Edit, Trash2, Eye } from 'lucide-react';

interface Staff {
  id: string;
  name: string;
  cnic: string;
  phone: string;
  staffType: string;
  shift: string;
  salary: number;
  joiningDate: string;
  status: string;
}

const staffTypeBadge: Record<string, string> = {
  SECURITY: 'badge-primary',
  COOKING: 'badge-success',
  LAUNDRY: 'badge-warning',
  CLEANING: 'badge-danger',
  MAINTENANCE: 'badge-primary',
};

export default function StaffListPage() {
  const params = useParams();
  const router = useRouter();
  const hostelId = params.id as string;

  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hostels/${hostelId}/staff`);
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoading(false);
    }
  }, [hostelId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/hostels/${hostelId}/staff/${deleteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStaff((prev) => prev.filter((s) => s.id !== deleteId));
      }
    } catch (error) {
      console.error('Failed to delete staff:', error);
    } finally {
      setDeleteId(null);
    }
  };

  const activeStaff = staff.filter((s) => s.status === 'ACTIVE');
  const totalSalary = activeStaff.reduce((sum, s) => sum + s.salary, 0);

  const columns = [
    {
      label: 'Name',
      key: 'name' as keyof Staff,
      render: (row: Staff) => <span className="font-medium">{row.name}</span>,
    },
    {
      label: 'Type',
      key: 'staffType' as keyof Staff,
      render: (row: Staff) => (
        <span className={staffTypeBadge[row.staffType] || 'badge-primary'}>
          {row.staffType}
        </span>
      ),
    },
    {
      label: 'Shift',
      key: 'shift' as keyof Staff,
      render: (row: Staff) => <span>{row.shift}</span>,
    },
    {
      label: 'Salary',
      key: 'salary' as keyof Staff,
      render: (row: Staff) => <span>{formatCurrency(row.salary)}</span>,
    },
    {
      label: 'Joining Date',
      key: 'joiningDate' as keyof Staff,
      render: (row: Staff) => <span>{formatDate(row.joiningDate)}</span>,
    },
    {
      label: 'Status',
      key: 'status' as keyof Staff,
      render: (row: Staff) => (
        <span className={row.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}>
          {row.status}
        </span>
      ),
    },
    {
      label: 'Actions',
      key: 'id' as keyof Staff,
      render: (row: Staff) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/hostel/${hostelId}/staff/${row.id}`)}
            className="text-indigo-600 hover:text-indigo-800"
            title="View"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => router.push(`/hostel/${hostelId}/staff/${row.id}/edit`)}
            className="text-yellow-600 hover:text-yellow-800"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleteId(row.id)}
            className="text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Staff Management" hostelId={hostelId}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="page-title">Staff Management</h1>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/hostel/${hostelId}/staff/salary`)}
              className="btn-secondary flex items-center gap-2"
            >
              <DollarSign size={16} />
              Salary Sheet
            </button>
            <button
              onClick={() => router.push(`/hostel/${hostelId}/staff/add`)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              Add Staff
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Staff"
            value={staff.length}
            icon={<Users size={24} />}
            color="#4F46E5"
          />
          <StatCard
            title="Active Staff"
            value={activeStaff.length}
            icon={<UserCheck size={24} />}
            color="#10B981"
          />
          <StatCard
            title="Monthly Salary Total"
            value={formatCurrency(totalSalary)}
            icon={<DollarSign size={24} />}
            color="#F59E0B"
          />
        </div>

        <div className="card">
          <DataTable
            columns={columns}
            data={staff}
            emptyMessage="No staff members found"
          />
        </div>

        <ConfirmDialog
          isOpen={!!deleteId}
          title="Delete Staff Member"
          message="Are you sure you want to delete this staff member? This action cannot be undone."
          onConfirm={handleDelete}
          onClose={() => setDeleteId(null)}
        />
      </div>
    </DashboardLayout>
  );
}
