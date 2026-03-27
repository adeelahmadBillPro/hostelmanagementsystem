'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { formatCurrency } from '@/lib/utils';
import {
  Building2,
  DollarSign,
  Receipt,
  Users,
  CreditCard,
  Download,
  FileText,
} from 'lucide-react';
import { MultiBarChart, PieChart } from '@/components/ui/chart';

const PIE_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#0EA5E9', '#8B5CF6'];

interface ReportData {
  type: string;
  data: Record<string, unknown>;
}

export default function ReportsPage() {
  const params = useParams();
  const hostelId = params.id as string;

  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = useCallback(
    async (type: string) => {
      try {
        setLoading(true);
        setActiveReport(type);
        const res = await fetch(`/api/hostels/${hostelId}/reports?type=${type}`);
        if (res.ok) {
          const data = await res.json();
          setReportData({ type, data });
        }
      } catch (error) {
        console.error('Failed to generate report:', error);
      } finally {
        setLoading(false);
      }
    },
    [hostelId]
  );

  const reportCards = [
    {
      type: 'occupancy',
      title: 'Occupancy Report',
      description: 'Rooms, beds, occupancy rate, and vacancy details',
      icon: <Building2 size={24} />,
      color: '#4F46E5',
    },
    {
      type: 'revenue',
      title: 'Revenue Report',
      description: 'Monthly revenue breakdown and trends',
      icon: <DollarSign size={24} />,
      color: '#10B981',
    },
    {
      type: 'expense',
      title: 'Expense Report',
      description: 'Expenses categorized by type',
      icon: <Receipt size={24} />,
      color: '#EF4444',
    },
    {
      type: 'residents',
      title: 'Resident List',
      description: 'All residents with their details',
      icon: <Users size={24} />,
      color: '#F59E0B',
    },
    {
      type: 'payments',
      title: 'Payment Summary',
      description: 'Payments breakdown by method',
      icon: <CreditCard size={24} />,
      color: '#0EA5E9',
    },
  ];

  const renderOccupancyReport = (data: Record<string, unknown>) => {
    const d = data as {
      totalRooms: number;
      totalBeds: number;
      occupiedBeds: number;
      vacantBeds: number;
      occupancyRate: number;
      roomBreakdown: { roomNumber: string; totalBeds: number; occupiedBeds: number; vacantBeds: number }[];
    };
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <p className="text-sm text-gray-500">Total Rooms</p>
            <p className="text-2xl font-bold">{d.totalRooms}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-gray-500">Total Beds</p>
            <p className="text-2xl font-bold">{d.totalBeds}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-gray-500">Occupied</p>
            <p className="text-2xl font-bold text-green-600">{d.occupiedBeds}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-gray-500">Vacant</p>
            <p className="text-2xl font-bold text-red-600">{d.vacantBeds}</p>
          </div>
        </div>
        <div className="card">
          <h3 className="section-title mb-4">Occupancy Rate: {d.occupancyRate?.toFixed(1)}%</h3>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-indigo-600 h-4 rounded-full transition-all"
              style={{ width: `${d.occupancyRate || 0}%` }}
            />
          </div>
        </div>
        {d.roomBreakdown && d.roomBreakdown.length > 0 && (
          <div className="card">
            <h3 className="section-title mb-4">Room-wise Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2">Room</th>
                    <th className="text-center px-4 py-2">Total Beds</th>
                    <th className="text-center px-4 py-2">Occupied</th>
                    <th className="text-center px-4 py-2">Vacant</th>
                  </tr>
                </thead>
                <tbody>
                  {d.roomBreakdown.map((room) => (
                    <tr key={room.roomNumber} className="border-b">
                      <td className="px-4 py-2 font-medium">{room.roomNumber}</td>
                      <td className="px-4 py-2 text-center">{room.totalBeds}</td>
                      <td className="px-4 py-2 text-center text-green-600">{room.occupiedBeds}</td>
                      <td className="px-4 py-2 text-center text-red-600">{room.vacantBeds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRevenueReport = (data: Record<string, unknown>) => {
    const d = data as {
      monthlyRevenue: { month: string; rent: number; food: number; other: number; total: number }[];
      totalRevenue: number;
    };
    return (
      <div className="space-y-6">
        <div className="card">
          <h3 className="section-title mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(d.totalRevenue || 0)}</p>
        </div>
        {d.monthlyRevenue && d.monthlyRevenue.length > 0 && (
          <div className="card">
            <h3 className="section-title mb-4">Monthly Revenue Breakdown</h3>
            <MultiBarChart
              data={d.monthlyRevenue.map((m) => ({ label: m.month, rent: m.rent, food: m.food, other: m.other }))}
              series={[
                { key: 'rent', name: 'Rent', color: '#4F46E5' },
                { key: 'food', name: 'Food', color: '#10B981' },
                { key: 'other', name: 'Other', color: '#F59E0B' },
              ]}
              height={350}
              formatValue={(v) => formatCurrency(v)}
            />
          </div>
        )}
      </div>
    );
  };

  const renderExpenseReport = (data: Record<string, unknown>) => {
    const d = data as {
      categories: { name: string; amount: number }[];
      totalExpenses: number;
    };
    return (
      <div className="space-y-6">
        <div className="card">
          <h3 className="section-title mb-2">Total Expenses</h3>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(d.totalExpenses || 0)}</p>
        </div>
        {d.categories && d.categories.length > 0 && (
          <div className="card">
            <h3 className="section-title mb-4">Expenses by Category</h3>
            <PieChart
              data={d.categories.map((c) => ({ label: c.name, value: c.amount }))}
              colors={PIE_COLORS}
              height={350}
              formatValue={(v) => formatCurrency(v)}
            />
          </div>
        )}
      </div>
    );
  };

  const renderResidentList = (data: Record<string, unknown>) => {
    const d = data as {
      residents: {
        name: string;
        cnic: string;
        phone: string;
        roomNumber: string;
        bedNumber: string;
        status: string;
        joiningDate: string;
      }[];
      totalResidents: number;
    };
    return (
      <div className="space-y-6">
        <div className="card">
          <h3 className="section-title mb-2">Total Residents</h3>
          <p className="text-3xl font-bold">{d.totalResidents || 0}</p>
        </div>
        {d.residents && d.residents.length > 0 && (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2">Name</th>
                    <th className="text-left px-4 py-2">CNIC</th>
                    <th className="text-left px-4 py-2">Phone</th>
                    <th className="text-left px-4 py-2">Room</th>
                    <th className="text-left px-4 py-2">Bed</th>
                    <th className="text-left px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.residents.map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-2 font-medium">{r.name}</td>
                      <td className="px-4 py-2">{r.cnic}</td>
                      <td className="px-4 py-2">{r.phone}</td>
                      <td className="px-4 py-2">{r.roomNumber}</td>
                      <td className="px-4 py-2">{r.bedNumber}</td>
                      <td className="px-4 py-2">
                        <span className={r.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPaymentSummary = (data: Record<string, unknown>) => {
    const d = data as {
      byMethod: { method: string; count: number; amount: number }[];
      totalPayments: number;
      totalAmount: number;
    };
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="section-title mb-2">Total Payments</h3>
            <p className="text-3xl font-bold">{d.totalPayments || 0}</p>
          </div>
          <div className="card">
            <h3 className="section-title mb-2">Total Amount</h3>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(d.totalAmount || 0)}</p>
          </div>
        </div>
        {d.byMethod && d.byMethod.length > 0 && (
          <div className="card">
            <h3 className="section-title mb-4">Payments by Method</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2">Payment Method</th>
                    <th className="text-center px-4 py-2">Count</th>
                    <th className="text-right px-4 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {d.byMethod.map((m) => (
                    <tr key={m.method} className="border-b">
                      <td className="px-4 py-2 font-medium">{m.method}</td>
                      <td className="px-4 py-2 text-center">{m.count}</td>
                      <td className="px-4 py-2 text-right font-semibold">{formatCurrency(m.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReport = () => {
    if (!reportData) return null;
    const { type, data } = reportData;
    switch (type) {
      case 'occupancy':
        return renderOccupancyReport(data);
      case 'revenue':
        return renderRevenueReport(data);
      case 'expense':
        return renderExpenseReport(data);
      case 'residents':
        return renderResidentList(data);
      case 'payments':
        return renderPaymentSummary(data);
      default:
        return null;
    }
  };

  return (
    <DashboardLayout title="Reports" hostelId={hostelId}>
      <div className="space-y-6">
        <h1 className="page-title">Reports</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportCards.map((card) => (
            <div
              key={card.type}
              className={`card cursor-pointer hover:shadow-lg transition-shadow ${
                activeReport === card.type ? 'ring-2 ring-indigo-500' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: `${card.color}15`, color: card.color }}
                >
                  {card.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{card.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{card.description}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => generateReport(card.type)}
                  disabled={loading && activeReport === card.type}
                  className="btn-primary text-sm flex items-center gap-1"
                >
                  <FileText size={14} />
                  {loading && activeReport === card.type ? 'Generating...' : 'Generate'}
                </button>
                <button
                  onClick={() => {
                    window.open(
                      `/api/hostels/${hostelId}/reports?type=${card.type}&format=pdf`,
                      '_blank'
                    );
                  }}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  <Download size={14} />
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-500">Generating report...</div>
        )}

        {!loading && reportData && (
          <div className="mt-6">
            <h2 className="section-title mb-4">
              {reportCards.find((c) => c.type === reportData.type)?.title}
            </h2>
            {renderReport()}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
