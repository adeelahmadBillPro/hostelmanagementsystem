'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import Modal from '@/components/ui/modal';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2, Megaphone } from 'lucide-react';

interface Notice {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export default function NoticesPage() {
  const params = useParams();
  const hostelId = params.id as string;

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editNotice, setEditNotice] = useState<Notice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ title: '', content: '' });

  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hostels/${hostelId}/notices`);
      if (res.ok) {
        const data = await res.json();
        setNotices(data.notices || []);
      }
    } catch (error) {
      console.error('Failed to fetch notices:', error);
    } finally {
      setLoading(false);
    }
  }, [hostelId]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const openAddModal = () => {
    setEditNotice(null);
    setForm({ title: '', content: '' });
    setShowModal(true);
  };

  const openEditModal = (notice: Notice) => {
    setEditNotice(notice);
    setForm({ title: notice.title, content: notice.content });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editNotice) {
        const res = await fetch(`/api/hostels/${hostelId}/notices/${editNotice.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          setShowModal(false);
          await fetchNotices();
        }
      } else {
        const res = await fetch(`/api/hostels/${hostelId}/notices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          setShowModal(false);
          await fetchNotices();
        }
      }
    } catch (error) {
      console.error('Failed to save notice:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/hostels/${hostelId}/notices/${deleteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotices((prev) => prev.filter((n) => n.id !== deleteId));
      }
    } catch (error) {
      console.error('Failed to delete notice:', error);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <DashboardLayout title="Notices" hostelId={hostelId}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Notices</h1>
          <button
            onClick={openAddModal}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Add Notice
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading notices...</div>
        ) : notices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Megaphone size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No notices yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notices.map((notice) => (
              <div key={notice.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg text-gray-900">{notice.title}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(notice)}
                      className="text-yellow-600 hover:text-yellow-800"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteId(notice.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 whitespace-pre-wrap line-clamp-4">
                  {notice.content}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t">
                  <span>By: {notice.authorName}</span>
                  <span>{formatDate(notice.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editNotice ? 'Edit Notice' : 'Add Notice'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="input"
                required
                placeholder="Notice title"
              />
            </div>
            <div>
              <label className="label">Content *</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                className="textarea"
                required
                rows={6}
                placeholder="Notice content..."
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
                {saving ? 'Saving...' : editNotice ? 'Update Notice' : 'Publish Notice'}
              </button>
            </div>
          </form>
        </Modal>

        <ConfirmDialog
          isOpen={!!deleteId}
          title="Delete Notice"
          message="Are you sure you want to delete this notice?"
          onConfirm={handleDelete}
          onClose={() => setDeleteId(null)}
        />
      </div>
    </DashboardLayout>
  );
}
