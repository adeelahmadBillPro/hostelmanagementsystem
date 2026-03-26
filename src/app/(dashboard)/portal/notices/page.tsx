'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { formatDate } from '@/lib/utils';
import { Megaphone } from 'lucide-react';

interface Notice {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export default function PortalNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await fetch('/api/portal/notices');
        if (res.ok) {
          const data = await res.json();
          setNotices(data.notices || []);
        }
      } catch (error) {
        console.error('Failed to fetch notices:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  return (
    <DashboardLayout title="Notices" hostelId="">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Megaphone size={28} className="text-yellow-600" />
          <h1 className="page-title">Hostel Notices</h1>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading notices...</div>
        ) : notices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Megaphone size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No notices at this time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <div key={notice.id} className="card hover:shadow-lg transition-shadow">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{notice.title}</h3>
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{notice.content}</p>
                <div className="flex items-center justify-between text-xs text-gray-400 pt-4 mt-4 border-t">
                  <span>By: {notice.authorName}</span>
                  <span>{formatDate(notice.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
