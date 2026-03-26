'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreditCard, ChevronDown, ChevronUp, Download, Receipt } from 'lucide-react';

interface Bill {
  id: string;
  month: string;
  year: number;
  monthLabel: string;
  rentAmount: number;
  foodCharges: number;
  utilityCharges: number;
  otherCharges: number;
  totalAmount: number;
  status: string;
  dueDate: string;
  paidAt: string | null;
  breakdown: {
    label: string;
    amount: number;
  }[];
}

interface PaymentRecord {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  receiptUrl: string | null;
}

export default function MyBillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const res = await fetch('/api/portal/bills');
        if (res.ok) {
          const data = await res.json();
          setBills(data.bills || []);
          setPayments(data.payments || []);
        }
      } catch (error) {
        console.error('Failed to fetch bills:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, []);

  const toggleExpand = (billId: string) => {
    setExpandedBill(expandedBill === billId ? null : billId);
  };

  return (
    <DashboardLayout title="My Bills" hostelId="">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CreditCard size={28} className="text-indigo-600" />
          <h1 className="page-title">My Bills</h1>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading bills...</div>
        ) : bills.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No bills found</div>
        ) : (
          <div className="space-y-4">
            {bills.map((bill) => (
              <div key={bill.id} className="card">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpand(bill.id)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">{bill.monthLabel}</h3>
                      <p className="text-sm text-gray-500">Due: {formatDate(bill.dueDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold">{formatCurrency(bill.totalAmount)}</p>
                      <span
                        className={
                          bill.status === 'PAID'
                            ? 'badge-success'
                            : bill.status === 'OVERDUE'
                            ? 'badge-danger'
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

                {expandedBill === bill.id && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <h4 className="font-medium text-gray-700">Breakdown</h4>
                    <div className="space-y-2">
                      {bill.breakdown.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.label}</span>
                          <span className="font-medium">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold pt-2 border-t">
                        <span>Total</span>
                        <span>{formatCurrency(bill.totalAmount)}</span>
                      </div>
                    </div>

                    {bill.paidAt && (
                      <p className="text-sm text-green-600">
                        Paid on: {formatDate(bill.paidAt)}
                      </p>
                    )}

                    <div className="flex gap-2">
                      {bill.status !== 'PAID' && (
                        <button className="btn-primary text-sm">Pay Now</button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/api/portal/bills?billId=${bill.id}&format=receipt`, '_blank');
                        }}
                        className="btn-secondary text-sm flex items-center gap-1"
                      >
                        <Download size={14} />
                        Download Receipt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="card">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <Receipt size={20} />
              Payment History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2">Date</th>
                    <th className="text-left px-4 py-2">Method</th>
                    <th className="text-right px-4 py-2">Amount</th>
                    <th className="text-center px-4 py-2">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b">
                      <td className="px-4 py-2">{formatDate(payment.paymentDate)}</td>
                      <td className="px-4 py-2">
                        <span className="badge-primary">{payment.paymentMethod}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {payment.receiptUrl ? (
                          <a
                            href={payment.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
