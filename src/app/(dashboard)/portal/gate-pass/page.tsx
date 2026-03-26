'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import Modal from '@/components/ui/modal';
import { formatDate } from '@/lib/utils';
import { Ticket, Plus } from 'lucide-react';

interface GatePass {
  id: string;
  leaveDate: string;
  returnDate: string;
  actualReturn: string | null;
  reason: string;
  status: string;
  createdAt: string;
}

const statusBadge: Record<string, string> = {
  PENDING: 'badge-warning',
  APPROVED: 'badge-success',
  REJECTED: 'badge-danger',
  ON_LEAVE: 'badge-primary',
  RETURNED: 'badge-success',
};

export default function MyGatePassesPage() {
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    leaveDate: '',
    returnDate: '',
    reason: '',
  });

  const fetchGatePasses = async () => {
    try {
      const res = await fetch('/api/portal/gate-passes');
      if (res.ok) {
        const data = await res.json();
        setGatePasses(data.gatePasses || []);
      }
    } catch (error) {
      console.error('Failed to fetch gate passes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGatePasses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/portal/gate-passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ leaveDate: '', returnDate: '', reason: '' });
        await fetchGatePasses();
      }
    } catch (error) {
      console.error('Failed to apply for gate pass:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="My Gate Passes" hostelId="">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Ticket size={28} className="text-indigo-600" />
            <h1 className="page-title">My Gate Passes</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Apply for Gate Pass
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading gate passes...</div>
        ) : gatePasses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Ticket size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No gate passes yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {gatePasses.map((gp) => (
              <div key={gp.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-500">Applied on: {formatDate(gp.createdAt)}</p>
                  </div>
                  <span className={statusBadge[gp.status] || 'badge-primary'}>
                    {gp.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Leave Date</p>
                    <p className="font-medium">{formatDate(gp.leaveDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Expected Return</p>
                    <p className="font-medium">{formatDate(gp.returnDate)}</p>
                  </div>
                  {gp.actualReturn && (
                    <div>
                      <p className="text-xs text-gray-500">Actual Return</p>
                      <p className="font-medium">{formatDate(gp.actualReturn)}</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t">
                  <p className="text-xs text-gray-500">Reason</p>
                  <p className="text-sm text-gray-700">{gp.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Apply for Gate Pass"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Leave Date *</label>
              <input
                type="date"
                value={form.leaveDate}
                onChange={(e) => setForm((prev) => ({ ...prev, leaveDate: e.target.value }))}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Expected Return Date *</label>
              <input
                type="date"
                value={form.returnDate}
                onChange={(e) => setForm((prev) => ({ ...prev, returnDate: e.target.value }))}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Reason *</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                className="textarea"
                required
                rows={4}
                placeholder="Reason for leave..."
              />
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
                {saving ? 'Submitting...' : 'Apply'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
