'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';
import { formatDate } from '@/lib/utils';
import { Users, Plus, LogOut } from 'lucide-react';

interface Visitor {
  id: string;
  name: string;
  cnic: string;
  phone: string;
  purpose: string;
  residentName: string;
  residentId: string;
  timeIn: string;
  timeOut: string | null;
}

interface Resident {
  id: string;
  name: string;
  roomNumber: string;
}

export default function VisitorsPage() {
  const params = useParams();
  const hostelId = params.id as string;

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const [form, setForm] = useState({
    name: '',
    cnic: '',
    phone: '',
    purpose: '',
    residentId: '',
  });

  const fetchVisitors = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/hostels/${hostelId}/visitors?date=${dateFilter}`
      );
      if (res.ok) {
        const data = await res.json();
        setVisitors(data.visitors || []);
        setResidents(data.residents || []);
      }
    } catch (error) {
      console.error('Failed to fetch visitors:', error);
    } finally {
      setLoading(false);
    }
  }, [hostelId, dateFilter]);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/hostels/${hostelId}/visitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ name: '', cnic: '', phone: '', purpose: '', residentId: '' });
        await fetchVisitors();
      }
    } catch (error) {
      console.error('Failed to add visitor:', error);
    } finally {
      setSaving(false);
    }
  };

  const markOut = async (visitorId: string) => {
    try {
      const res = await fetch(`/api/hostels/${hostelId}/visitors`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
      });
      if (res.ok) {
        setVisitors((prev) =>
          prev.map((v) =>
            v.id === visitorId ? { ...v, timeOut: new Date().toISOString() } : v
          )
        );
      }
    } catch (error) {
      console.error('Failed to mark visitor out:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns = [
    {
      label: 'Name',
      key: 'name' as keyof Visitor,
      render: (row: Visitor) => <span className="font-medium">{row.name}</span>,
    },
    {
      label: 'CNIC',
      key: 'cnic' as keyof Visitor,
    },
    {
      label: 'Phone',
      key: 'phone' as keyof Visitor,
    },
    {
      label: 'Purpose',
      key: 'purpose' as keyof Visitor,
    },
    {
      label: 'Visiting',
      key: 'residentName' as keyof Visitor,
      render: (row: Visitor) => <span className="badge-primary">{row.residentName}</span>,
    },
    {
      label: 'Time In',
      key: 'timeIn' as keyof Visitor,
      render: (row: Visitor) => <span>{formatTime(row.timeIn)}</span>,
    },
    {
      label: 'Time Out',
      key: 'timeOut' as keyof Visitor,
      render: (row: Visitor) => (
        <span>{row.timeOut ? formatTime(row.timeOut) : <span className="badge-warning">Still In</span>}</span>
      ),
    },
    {
      label: 'Action',
      key: 'id' as keyof Visitor,
      render: (row: Visitor) =>
        !row.timeOut ? (
          <button
            onClick={() => markOut(row.id)}
            className="btn-danger text-xs px-3 py-1 flex items-center gap-1"
          >
            <LogOut size={14} />
            Mark Out
          </button>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
  ];

  return (
    <DashboardLayout title="Visitors" hostelId={hostelId}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="page-title">Visitors</h1>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Add Visitor
          </button>
        </div>

        <div className="card">
          <div className="flex items-center gap-4 mb-4">
            <div>
              <label className="label">Filter by Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <DataTable
            columns={columns}
            data={visitors}
            emptyMessage="No visitors recorded for this date"
          />
        </div>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Add Visitor"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Visitor Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="input"
                required
                placeholder="Enter visitor name"
              />
            </div>
            <div>
              <label className="label">CNIC *</label>
              <input
                type="text"
                value={form.cnic}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, '').slice(0, 13);
                  if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
                  if (val.length > 13) val = val.slice(0, 13) + '-' + val.slice(13);
                  setForm((prev) => ({ ...prev, cnic: val }));
                }}
                className="input"
                required
                placeholder="35202-1234567-1"
                maxLength={15}
              />
              <p className="text-[10px] text-text-muted mt-1">13-digit CNIC number</p>
            </div>
            <div>
              <label className="label">Phone *</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setForm((prev) => ({ ...prev, phone: val }));
                }}
                className="input"
                required
                placeholder="03001234567"
                maxLength={11}
              />
            </div>
            <div>
              <label className="label">Purpose *</label>
              <input
                type="text"
                value={form.purpose}
                onChange={(e) => setForm((prev) => ({ ...prev, purpose: e.target.value }))}
                className="input"
                required
                placeholder="Purpose of visit"
              />
            </div>
            <div>
              <label className="label">Visiting Resident *</label>
              <select
                value={form.residentId}
                onChange={(e) => setForm((prev) => ({ ...prev, residentId: e.target.value }))}
                className="select"
                required
              >
                <option value="">Select Resident</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} - Room {r.roomNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Add Visitor'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
