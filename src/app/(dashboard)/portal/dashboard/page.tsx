'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Home,
  CreditCard,
  UtensilsCrossed,
  MessageSquare,
  Megaphone,
  ArrowRight,
  CalendarDays,
  Shield,
  Banknote,
  FileText,
} from 'lucide-react';

interface DashboardData {
  resident: {
    name: string;
    roomNumber: string;
    bedNumber: string;
    hostelName: string;
  };
  currentBill: {
    id: string;
    amount: number;
    status: string;
    month: string;
    dueDate: string;
  } | null;
  recentNotices: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
  }[];
}

export default function PortalDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/portal/dashboard');
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Portal Dashboard" hostelId="">
        <div className="text-center py-12 text-gray-500 dark:text-slate-400">Loading dashboard...</div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Portal Dashboard" hostelId="">
        <div className="text-center py-12 text-gray-500 dark:text-slate-400">Failed to load dashboard data.</div>
      </DashboardLayout>
    );
  }

  const quickLinks = [
    {
      title: 'View Bill',
      description: 'Check your monthly bills and payment history',
      icon: <CreditCard size={24} />,
      href: '/portal/bill',
      color: '#4F46E5',
    },
    {
      title: 'Order Food',
      description: "Browse today's menu and place orders",
      icon: <UtensilsCrossed size={24} />,
      href: '/portal/food',
      color: '#10B981',
    },
    {
      title: 'File Complaint',
      description: 'Report an issue or file a complaint',
      icon: <MessageSquare size={24} />,
      href: '/portal/complaints',
      color: '#EF4444',
    },
  ];

  return (
    <DashboardLayout title="Portal Dashboard" hostelId="">
      <div className="space-y-6">
        {/* Welcome Message */}
        <div className="card bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <h1 className="text-2xl font-bold">Welcome, {data.resident.name}!</h1>
          <p className="text-indigo-100 mt-1">{data.resident.hostelName}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Room Info Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Home size={24} />
              </div>
              <h2 className="section-title">Room / Bed Info</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-400">Room Number</span>
                <span className="font-semibold">{data.resident.roomNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-400">Bed Number</span>
                <span className="font-semibold">{data.resident.bedNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-400">Hostel</span>
                <span className="font-semibold">{data.resident.hostelName}</span>
              </div>
            </div>
          </div>

          {/* Agreement Info */}
          {(data as any).agreement && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                  <FileText size={24} />
                </div>
                <h2 className="section-title">Agreement Info</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Move-in Date</span>
                  <span className="font-semibold">{(data as any).agreement.moveInDate ? formatDate((data as any).agreement.moveInDate) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Room Type</span>
                  <span className="font-semibold">{(data as any).agreement.roomType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Monthly Rent</span>
                  <span className="font-bold text-primary">{formatCurrency((data as any).agreement.monthlyRent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Advance Paid</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency((data as any).agreement.advancePaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Security Deposit</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency((data as any).agreement.securityDeposit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Food Plan</span>
                  <span className={
                    (data as any).agreement.foodPlan === 'FULL_MESS' ? 'badge-success' :
                    (data as any).agreement.foodPlan === 'NO_MESS' ? 'badge-secondary' : 'badge-warning'
                  }>
                    {(data as any).agreement.foodPlan === 'FULL_MESS' ? 'Full Mess' :
                     (data as any).agreement.foodPlan === 'NO_MESS' ? 'No Mess' : 'Custom'}
                  </span>
                </div>
                {(data as any).agreement.foodPlan === 'CUSTOM' && (data as any).agreement.customFoodFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-slate-400">Custom Food Fee</span>
                    <span className="font-semibold">{formatCurrency((data as any).agreement.customFoodFee)}/month</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Status</span>
                  <span className={(data as any).agreement.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}>
                    {(data as any).agreement.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Current Month Bill */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <CreditCard size={24} />
              </div>
              <h2 className="section-title">Current Month Bill</h2>
            </div>
            {data.currentBill ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Month</span>
                  <span className="font-semibold">{data.currentBill.month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Amount</span>
                  <span className="text-2xl font-bold">{formatCurrency(data.currentBill.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Status</span>
                  <span
                    className={
                      data.currentBill.status === 'PAID' ? 'badge-success' : 'badge-warning'
                    }
                  >
                    {data.currentBill.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Due Date</span>
                  <span>{formatDate(data.currentBill.dueDate)}</span>
                </div>
                {data.currentBill.status !== 'PAID' && (
                  <button
                    onClick={() => router.push('/portal/bill')}
                    className="btn-primary w-full mt-3"
                  >
                    Pay Now
                  </button>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">No bill generated yet</p>
            )}
          </div>
        </div>

        {/* Recent Notices */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
                <Megaphone size={24} />
              </div>
              <h2 className="section-title">Recent Notices</h2>
            </div>
            <button
              onClick={() => router.push('/portal/notices')}
              className="text-indigo-600 hover:underline text-sm flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          {data.recentNotices.length > 0 ? (
            <div className="space-y-3">
              {data.recentNotices.map((notice) => (
                <div key={notice.id} className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white">{notice.title}</h4>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notice.content}</p>
                  <p className="text-xs text-gray-400 mt-2">{formatDate(notice.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">No recent notices</p>
          )}
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="section-title mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickLinks.map((link) => (
              <div
                key={link.title}
                onClick={() => router.push(link.href)}
                className="card cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${link.color}15`, color: link.color }}
                  >
                    {link.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{link.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{link.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
