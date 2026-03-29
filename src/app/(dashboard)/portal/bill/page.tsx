'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import Modal from '@/components/ui/modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CreditCard,
  ChevronDown,
  ChevronUp,
  Download,
  Receipt,
  Utensils,
  Car,
  Zap,
  Home,
  AlertTriangle,
  Gift,
  Loader2,
} from 'lucide-react';

// ==================== TYPES ====================

interface Bill {
  id: string;
  month: number;
  year: number;
  monthLabel: string;
  rentAmount: number;
  foodCharges: number;
  utilityCharges: number;
  otherCharges: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  dueDate?: string;
  paidAt?: string | null;
  isDisputed?: boolean;
}

interface BillDetail {
  bill: {
    id: string;
    month: number;
    year: number;
    roomRent: number;
    foodCharges: number;
    otherCharges: number;
    meterCharges: number;
    parkingFee: number;
    previousBalance: number;
    advanceDeduction: number;
    discount: number;
    totalAmount: number;
    paidAmount: number;
    balance: number;
    status: string;
    dueDate: string | null;
    notes: string | null;
    isDisputed: boolean;
  };
  room: {
    roomNumber: string;
    type: string;
    buildingName: string;
    floorName: string;
    bedNumber: string;
    rentPerBed: number;
  };
  foodOrders: {
    id: string;
    orderDate: string;
    quantity: number;
    totalAmount: number;
    menuItem: {
      itemName: string;
      rate: number;
      mealType: string;
      category: string;
      isFree: boolean;
    };
  }[];
  parking: {
    vehicleType: string;
    vehicleNumber: string;
    monthlyFee: number;
  } | null;
  meterReading: {
    previousReading: number;
    currentReading: number;
    units: number;
    ratePerUnit: number;
    amount: number;
  } | null;
  payments: {
    id: string;
    amount: number;
    method: string;
    date: string;
    receiptNumber: string | null;
    notes: string | null;
  }[];
  disputes: {
    id: string;
    category: string;
    description: string;
    status: string;
    resolution: string | null;
  }[];
}

// ==================== COMPONENT ====================

export default function MyBillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const [billDetails, setBillDetails] = useState<Record<string, BillDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Dispute modal state
  const [disputeModal, setDisputeModal] = useState(false);
  const [disputeBillId, setDisputeBillId] = useState<string | null>(null);
  const [disputeCategory, setDisputeCategory] = useState('food');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const res = await fetch('/api/portal/bills');
        if (res.ok) {
          const data = await res.json();
          setBills(data.bills || []);
        }
      } catch (error) {
        console.error('Failed to fetch bills:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, []);

  const fetchBillDetail = useCallback(async (billId: string) => {
    if (billDetails[billId]) return; // Already loaded
    setLoadingDetail(billId);
    try {
      const res = await fetch(`/api/portal/bills/${billId}`);
      if (res.ok) {
        const data = await res.json();
        setBillDetails((prev) => ({ ...prev, [billId]: data }));
      }
    } catch (error) {
      console.error('Failed to fetch bill detail:', error);
    } finally {
      setLoadingDetail(null);
    }
  }, [billDetails]);

  const toggleExpand = (billId: string) => {
    if (expandedBill === billId) {
      setExpandedBill(null);
    } else {
      setExpandedBill(billId);
      fetchBillDetail(billId);
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openDisputeModal = (billId: string) => {
    setDisputeBillId(billId);
    setDisputeCategory('food');
    setDisputeDescription('');
    setDisputeModal(true);
  };

  const submitDispute = async () => {
    if (!disputeBillId || !disputeDescription.trim()) return;
    setDisputeSubmitting(true);
    try {
      const res = await fetch('/api/portal/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: disputeBillId,
          category: disputeCategory,
          description: disputeDescription.trim(),
        }),
      });
      if (res.ok) {
        setDisputeModal(false);
        // Refresh the bill detail
        setBillDetails((prev) => {
          const copy = { ...prev };
          delete copy[disputeBillId!];
          return copy;
        });
        fetchBillDetail(disputeBillId);
      }
    } catch (error) {
      console.error('Failed to submit dispute:', error);
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const categoryLabels: Record<string, string> = {
    food: 'Food Charges',
    electricity: 'Electricity / Meter',
    parking: 'Parking Fee',
    room_rent: 'Room Rent',
    other: 'Other',
  };

  const disputeStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return 'badge-warning';
      case 'UNDER_REVIEW': return 'badge-primary';
      case 'RESOLVED': return 'badge-success';
      case 'REJECTED': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  // ==================== RENDER BILL DETAIL ====================

  const renderBillDetail = (billId: string) => {
    if (loadingDetail === billId) {
      return (
        <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
          <Loader2 size={20} className="animate-spin mr-2" />
          Loading itemized breakdown...
        </div>
      );
    }

    const detail = billDetails[billId];
    if (!detail) return null;

    const { bill, room, foodOrders, parking, meterReading, payments, disputes } = detail;
    const foodSectionKey = `food-${billId}`;

    return (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#1E2D42] space-y-5">

        {/* Room Rent Section */}
        <div className="rounded-lg border border-gray-200 dark:border-[#1E2D42] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-[#0B1222]">
            <Home size={16} className="text-indigo-500" />
            <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Room Rent</span>
            <span className="ml-auto font-bold text-sm">{formatCurrency(bill.roomRent)}</span>
          </div>
          <div className="px-4 py-3 text-sm space-y-1 text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Room {room.roomNumber} ({room.type})</span>
              <span>{room.buildingName} - {room.floorName}</span>
            </div>
            <div className="flex justify-between">
              <span>Bed #{room.bedNumber}</span>
              <span>Rent/Bed: {formatCurrency(room.rentPerBed)}</span>
            </div>
          </div>
        </div>

        {/* Food Section */}
        {(bill.foodCharges > 0 || foodOrders.length > 0) && (
          <div className="rounded-lg border border-gray-200 dark:border-[#1E2D42] overflow-hidden">
            <div
              className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-[#0B1222] cursor-pointer"
              onClick={() => toggleSection(foodSectionKey)}
            >
              <Utensils size={16} className="text-orange-500" />
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                Food Charges ({foodOrders.length} orders)
              </span>
              <span className="ml-auto font-bold text-sm mr-2">{formatCurrency(bill.foodCharges)}</span>
              {expandedSections[foodSectionKey] ? (
                <ChevronUp size={16} className="text-gray-400" />
              ) : (
                <ChevronDown size={16} className="text-gray-400" />
              )}
            </div>
            {expandedSections[foodSectionKey] && (
              <div className="max-h-64 overflow-y-auto">
                {foodOrders.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No food orders this month.</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-[#1E2D42] bg-white dark:bg-[#111C2E]">
                        <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Date</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Item</th>
                        <th className="text-center px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Meal</th>
                        <th className="text-center px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Qty</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Rate</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {foodOrders.map((order) => (
                        <tr key={order.id} className="border-b border-gray-50 dark:border-[#1E2D42] hover:bg-gray-50 dark:hover:bg-[#0B1222] transition-colors">
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{formatDate(order.orderDate)}</td>
                          <td className="px-4 py-2 text-gray-800 dark:text-gray-200">
                            {order.menuItem.itemName}
                            {order.menuItem.isFree && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <Gift size={10} /> FREE
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className="badge-primary text-[10px]">{order.menuItem.mealType}</span>
                          </td>
                          <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">{order.quantity}</td>
                          <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(order.menuItem.rate)}</td>
                          <td className="px-4 py-2 text-right font-medium text-gray-800 dark:text-gray-200">
                            {order.totalAmount === 0 ? (
                              <span className="text-green-600 dark:text-green-400">FREE</span>
                            ) : (
                              formatCurrency(order.totalAmount)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}

        {/* Parking Section */}
        {(bill.parkingFee > 0 || parking) && (
          <div className="rounded-lg border border-gray-200 dark:border-[#1E2D42] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-[#0B1222]">
              <Car size={16} className="text-blue-500" />
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Parking</span>
              <span className="ml-auto font-bold text-sm">{formatCurrency(bill.parkingFee)}</span>
            </div>
            {parking && (
              <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 flex justify-between">
                <span>{parking.vehicleType} - {parking.vehicleNumber}</span>
                <span>{formatCurrency(parking.monthlyFee)}/mo</span>
              </div>
            )}
          </div>
        )}

        {/* Electricity / Meter Section */}
        {(bill.meterCharges > 0 || meterReading) && (
          <div className="rounded-lg border border-gray-200 dark:border-[#1E2D42] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-[#0B1222]">
              <Zap size={16} className="text-yellow-500" />
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Electricity</span>
              <span className="ml-auto font-bold text-sm">{formatCurrency(bill.meterCharges)}</span>
            </div>
            {meterReading && (
              <div className="px-4 py-3 text-sm space-y-1 text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Previous Reading</span>
                  <span>{meterReading.previousReading}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Reading</span>
                  <span>{meterReading.currentReading}</span>
                </div>
                <div className="flex justify-between">
                  <span>Units Consumed</span>
                  <span>{meterReading.units} units</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate/Unit</span>
                  <span>{formatCurrency(meterReading.ratePerUnit)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Other Charges */}
        {bill.otherCharges > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-[#1E2D42] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-[#0B1222]">
              <Receipt size={16} className="text-gray-500 dark:text-slate-400" />
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Other Charges</span>
              <span className="ml-auto font-bold text-sm">{formatCurrency(bill.otherCharges)}</span>
            </div>
          </div>
        )}

        {/* Summary: Previous Balance, Advance, Discount, Total */}
        <div className="rounded-lg border border-gray-200 dark:border-[#1E2D42] overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-[#0B1222]">
            <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Bill Summary</span>
          </div>
          <div className="px-4 py-3 text-sm space-y-2">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Room Rent</span>
              <span>{formatCurrency(bill.roomRent)}</span>
            </div>
            {bill.foodCharges > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Food Charges</span>
                <span>{formatCurrency(bill.foodCharges)}</span>
              </div>
            )}
            {bill.parkingFee > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Parking Fee</span>
                <span>{formatCurrency(bill.parkingFee)}</span>
              </div>
            )}
            {bill.meterCharges > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Electricity</span>
                <span>{formatCurrency(bill.meterCharges)}</span>
              </div>
            )}
            {bill.otherCharges > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Other Charges</span>
                <span>{formatCurrency(bill.otherCharges)}</span>
              </div>
            )}
            {bill.previousBalance > 0 && (
              <div className="flex justify-between text-red-600 dark:text-red-400">
                <span>Previous Balance</span>
                <span>+{formatCurrency(bill.previousBalance)}</span>
              </div>
            )}
            {bill.advanceDeduction > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Advance Deduction</span>
                <span>-{formatCurrency(bill.advanceDeduction)}</span>
              </div>
            )}
            {bill.discount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Discount</span>
                <span>-{formatCurrency(bill.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200 dark:border-[#1E2D42] text-gray-900 dark:text-white">
              <span>Total Amount</span>
              <span>{formatCurrency(bill.totalAmount)}</span>
            </div>
            {bill.paidAmount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Paid Amount</span>
                <span>{formatCurrency(bill.paidAmount)}</span>
              </div>
            )}
            {bill.balance > 0 && (
              <div className="flex justify-between font-semibold text-red-600 dark:text-red-400">
                <span>Remaining Balance</span>
                <span>{formatCurrency(bill.balance)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment History for this bill */}
        {payments.length > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-[#1E2D42] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-[#0B1222]">
              <Receipt size={16} className="text-green-500" />
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Payments ({payments.length})</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-[#1E2D42]">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(payment.date)} via {payment.method}
                    </p>
                  </div>
                  {payment.receiptNumber && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">#{payment.receiptNumber}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disputes for this bill */}
        {disputes.length > 0 && (
          <div className="rounded-lg border border-orange-200 dark:border-orange-900/40 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 dark:bg-orange-900/20">
              <AlertTriangle size={16} className="text-orange-500" />
              <span className="font-semibold text-sm text-orange-700 dark:text-orange-300">Disputes ({disputes.length})</span>
            </div>
            <div className="divide-y divide-orange-100 dark:divide-orange-900/30">
              {disputes.map((dispute) => (
                <div key={dispute.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {categoryLabels[dispute.category] || dispute.category}
                    </span>
                    <span className={disputeStatusBadge(dispute.status)}>{dispute.status}</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">{dispute.description}</p>
                  {dispute.resolution && (
                    <p className="text-green-600 dark:text-green-400 text-xs mt-1">Resolution: {dispute.resolution}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {bill.status !== 'PAID' && (
            <button onClick={() => router.push("/portal/pay")} className="btn-primary text-sm">Pay Now</button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDisputeModal(billId);
            }}
            className="btn-secondary text-sm flex items-center gap-1"
          >
            <AlertTriangle size={14} />
            Dispute Item
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/api/portal/bills?billId=${billId}&format=receipt`, '_blank');
            }}
            className="btn-secondary text-sm flex items-center gap-1"
          >
            <Download size={14} />
            Download Receipt
          </button>
        </div>

        {bill.notes && (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">Note: {bill.notes}</p>
        )}
      </div>
    );
  };

  // ==================== MAIN RENDER ====================

  return (
    <DashboardLayout title="My Bills" hostelId="">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CreditCard size={28} className="text-indigo-600" />
          <h1 className="page-title">My Bills</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            Loading bills...
          </div>
        ) : bills.length === 0 ? (
          <div className="card text-center py-12">
            <CreditCard size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600 dark:text-slate-400" />
            <p className="text-gray-500 dark:text-gray-400">No bills found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bills.map((bill) => (
              <div
                key={bill.id}
                className="card transition-all duration-200 hover:shadow-md dark:bg-[#111C2E] dark:border-[#1E2D42]"
              >
                <div
                  className="flex items-center justify-between flex-wrap gap-2 cursor-pointer"
                  onClick={() => toggleExpand(bill.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      bill.status === 'PAID'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : bill.status === 'OVERDUE'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : 'bg-yellow-100 dark:bg-yellow-900/30'
                    }`}>
                      <CreditCard size={18} className={
                        bill.status === 'PAID'
                          ? 'text-green-600'
                          : bill.status === 'OVERDUE'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      } />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-gray-900 dark:text-white">
                        {bill.monthLabel}
                        {bill.isDisputed && (
                          <AlertTriangle size={14} className="inline ml-2 text-orange-500" />
                        )}
                      </h3>
                      {bill.dueDate && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Due: {formatDate(bill.dueDate)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(bill.totalAmount)}</p>
                      <span
                        className={
                          bill.status === 'PAID'
                            ? 'badge-success'
                            : bill.status === 'OVERDUE'
                            ? 'badge-danger'
                            : bill.status === 'PARTIAL'
                            ? 'badge-primary'
                            : 'badge-warning'
                        }
                      >
                        {bill.status}
                      </span>
                    </div>
                    {expandedBill === bill.id ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedBill === bill.id && renderBillDetail(bill.id)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dispute Modal */}
      <Modal isOpen={disputeModal} onClose={() => setDisputeModal(false)} title="Dispute Bill Item">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={disputeCategory}
              onChange={(e) => setDisputeCategory(e.target.value)}
              className="input-field w-full"
            >
              <option value="food">Food Charges</option>
              <option value="electricity">Electricity / Meter</option>
              <option value="parking">Parking Fee</option>
              <option value="room_rent">Room Rent</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={disputeDescription}
              onChange={(e) => setDisputeDescription(e.target.value)}
              rows={4}
              placeholder="Describe the issue with this bill item..."
              className="input-field w-full resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={submitDispute}
              disabled={disputeSubmitting || !disputeDescription.trim()}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {disputeSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Dispute'
              )}
            </button>
            <button onClick={() => setDisputeModal(false)} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
