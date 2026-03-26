'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import Modal from '@/components/ui/modal';
import { formatDate } from '@/lib/utils';
import { MessageSquare, Plus, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Complaint {
  id: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const COMPLAINT_CATEGORIES = [
  'PLUMBING',
  'ELECTRICAL',
  'FURNITURE',
  'CLEANING',
  'FOOD',
  'SECURITY',
  'NOISE',
  'INTERNET',
  'OTHER',
];

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

export default function MyComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: 'PLUMBING', description: '' });

  const fetchComplaints = async () => {
    try {
      const res = await fetch('/api/portal/complaints');
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
      }
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/portal/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ category: 'PLUMBING', description: '' });
        await fetchComplaints();
      }
    } catch (error) {
      console.error('Failed to file complaint:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="My Complaints" hostelId="">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare size={28} className="text-red-600" />
            <h1 className="page-title">My Complaints</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            File Complaint
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading complaints...</div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No complaints filed yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((complaint) => (
              <div key={complaint.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <span className="badge-primary text-xs">{complaint.category}</span>
                  <span className={`${statusBadge[complaint.status]} flex items-center gap-1`}>
                    {statusIcon[complaint.status]}
                    {complaint.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-gray-700 text-sm mb-3">{complaint.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t">
                  <span>Filed on: {formatDate(complaint.createdAt)}</span>
                  <span>Last updated: {formatDate(complaint.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="File a Complaint"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="select"
                required
              >
                {COMPLAINT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="textarea"
                required
                rows={5}
                placeholder="Describe your complaint in detail..."
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
                {saving ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
