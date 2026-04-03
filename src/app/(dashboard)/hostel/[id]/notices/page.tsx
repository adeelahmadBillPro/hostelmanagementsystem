'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import Modal from '@/components/ui/modal';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2, Megaphone, Users, User, DoorOpen } from 'lucide-react';

interface Notice {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  targetType: 'ALL' | 'RESIDENT' | 'ROOM';
  targetResidentId: string | null;
  targetResidentName: string | null;
  targetRoomId: string | null;
  targetRoomNumber: string | null;
}

interface ResidentOption {
  id: string;
  name: string;
  roomNumber: string;
}

interface RoomOption {
  id: string;
  roomNumber: string;
  buildingName: string;
}

export default function NoticesPage() {
  const params = useParams();
  const hostelId = params.id as string;

  const [notices, setNotices] = useState<Notice[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editNotice, setEditNotice] = useState<Notice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    content: '',
    targetType: 'ALL' as 'ALL' | 'RESIDENT' | 'ROOM',
    targetResidentId: '',
    targetRoomId: '',
  });

  // Lazy-loaded residents and rooms
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [residentsLoaded, setResidentsLoaded] = useState(false);
  const [roomsLoaded, setRoomsLoaded] = useState(false);

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

  const fetchResidents = useCallback(async () => {
    if (residentsLoaded) return;
    setLoadingResidents(true);
    try {
      const res = await fetch(`/api/hostels/${hostelId}/residents?status=ACTIVE`);
      if (res.ok) {
        const data = await res.json();
        setResidents(
          (data.residents || []).map((r: any) => ({
            id: r.id,
            name: r.user.name,
            roomNumber: r.room?.roomNumber || '',
          }))
        );
        setResidentsLoaded(true);
      }
    } catch (error) {
      console.error('Failed to fetch residents:', error);
    } finally {
      setLoadingResidents(false);
    }
  }, [hostelId, residentsLoaded]);

  const fetchRooms = useCallback(async () => {
    if (roomsLoaded) return;
    setLoadingRooms(true);
    try {
      const res = await fetch(`/api/hostels/${hostelId}/rooms`);
      if (res.ok) {
        const data = await res.json();
        setRooms(
          (data.rooms || []).map((r: any) => ({
            id: r.id,
            roomNumber: r.roomNumber,
            buildingName: r.floor?.building?.name || '',
          }))
        );
        setRoomsLoaded(true);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoadingRooms(false);
    }
  }, [hostelId, roomsLoaded]);

  const handleTargetTypeChange = (value: 'ALL' | 'RESIDENT' | 'ROOM') => {
    setForm((prev) => ({
      ...prev,
      targetType: value,
      targetResidentId: '',
      targetRoomId: '',
    }));
    if (value === 'RESIDENT') fetchResidents();
    if (value === 'ROOM') fetchRooms();
  };

  const openAddModal = () => {
    setEditNotice(null);
    setForm({ title: '', content: '', targetType: 'ALL', targetResidentId: '', targetRoomId: '' });
    setShowModal(true);
  };

  const openEditModal = (notice: Notice) => {
    setEditNotice(notice);
    setForm({
      title: notice.title,
      content: notice.content,
      targetType: notice.targetType || 'ALL',
      targetResidentId: notice.targetResidentId || '',
      targetRoomId: notice.targetRoomId || '',
    });
    // Pre-load dropdowns if needed
    if (notice.targetType === 'RESIDENT') fetchResidents();
    if (notice.targetType === 'ROOM') fetchRooms();
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        content: form.content,
        targetType: form.targetType,
        targetResidentId: form.targetType === 'RESIDENT' ? form.targetResidentId || null : null,
        targetRoomId: form.targetType === 'ROOM' ? form.targetRoomId || null : null,
      };

      if (editNotice) {
        const res = await fetch(`/api/hostels/${hostelId}/notices/${editNotice.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setShowModal(false);
          await fetchNotices();
        }
      } else {
        const res = await fetch(`/api/hostels/${hostelId}/notices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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

  const getTargetBadge = (notice: Notice) => {
    if (!notice.targetType || notice.targetType === 'ALL') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
          <Users size={10} /> All Residents
        </span>
      );
    }
    if (notice.targetType === 'RESIDENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          <User size={10} /> {notice.targetResidentName || 'Resident'}
        </span>
      );
    }
    if (notice.targetType === 'ROOM') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
          <DoorOpen size={10} /> Room {notice.targetRoomNumber || ''}
        </span>
      );
    }
    return null;
  };

  const filteredNotices = notices.filter(
    (n) =>
      !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Notices" hostelId={hostelId}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="page-title">Notices</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notices..."
                className="input !h-9 !text-xs pl-8 w-48"
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Add Notice
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading notices...</div>
        ) : filteredNotices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Megaphone size={48} className="mx-auto mb-4 text-gray-300" />
            <p>{search ? `No notices found for "${search}"` : 'No notices yet'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotices.map((notice) => (
              <div key={notice.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{notice.title}</h3>
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

                {/* Target badge */}
                <div className="mb-3">
                  {getTargetBadge(notice)}
                </div>

                <p className="text-gray-600 dark:text-slate-300 text-sm mb-4 whitespace-pre-wrap line-clamp-4">
                  {notice.content}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-border">
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

            <div>
              <label className="label">Send To</label>
              <select
                value={form.targetType}
                onChange={(e) => handleTargetTypeChange(e.target.value as 'ALL' | 'RESIDENT' | 'ROOM')}
                className="select"
              >
                <option value="ALL">All Residents</option>
                <option value="RESIDENT">Specific Resident</option>
                <option value="ROOM">Specific Room</option>
              </select>
            </div>

            {form.targetType === 'RESIDENT' && (
              <div>
                <label className="label">Select Resident *</label>
                {loadingResidents ? (
                  <div className="input flex items-center text-text-muted text-sm">Loading residents...</div>
                ) : (
                  <select
                    value={form.targetResidentId}
                    onChange={(e) => setForm((prev) => ({ ...prev, targetResidentId: e.target.value }))}
                    className="select"
                    required
                  >
                    <option value="">-- Select a resident --</option>
                    {residents.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}{r.roomNumber ? ` (Room ${r.roomNumber})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {form.targetType === 'ROOM' && (
              <div>
                <label className="label">Select Room *</label>
                {loadingRooms ? (
                  <div className="input flex items-center text-text-muted text-sm">Loading rooms...</div>
                ) : (
                  <select
                    value={form.targetRoomId}
                    onChange={(e) => setForm((prev) => ({ ...prev, targetRoomId: e.target.value }))}
                    className="select"
                    required
                  >
                    <option value="">-- Select a room --</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.buildingName ? `${r.buildingName} - ` : ''}Room {r.roomNumber}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

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
