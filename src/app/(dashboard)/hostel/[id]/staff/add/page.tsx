'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Save, Home, UtensilsCrossed, Shield, ChefHat, Shirt, Wrench, Sparkles, UserCog } from 'lucide-react';

const STAFF_TYPES = [
  { value: 'SECURITY', label: 'Security Guard', icon: Shield, color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'COOKING', label: 'Cook / Chef', icon: ChefHat, color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { value: 'LAUNDRY', label: 'Laundry', icon: Shirt, color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'CLEANING', label: 'Cleaning', icon: Sparkles, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { value: 'MAINTENANCE', label: 'Maintenance', icon: Wrench, color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'ADMIN_STAFF', label: 'Admin Staff', icon: UserCog, color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
];

const SHIFTS = [
  { value: 'DAY', label: 'Day Shift (8AM - 8PM)' },
  { value: 'NIGHT', label: 'Night Shift (8PM - 8AM)' },
  { value: 'FULL', label: 'Full Time (24hr on-call)' },
];

export default function AddStaffPage() {
  const params = useParams();
  const router = useRouter();
  const hostelId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    cnic: '',
    phone: '',
    address: '',
    staffType: 'SECURITY',
    shift: 'DAY',
    salary: '',
    joiningDate: new Date().toISOString().split('T')[0],
    emergencyContact: '',
    emergencyPhone: '',
    freeAccommodation: false,
    roomNumber: '',
    freeFood: false,
    foodAllowance: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
    setForm((prev) => ({ ...prev, [target.name]: value }));
  };

  // CNIC formatting: XXXXX-XXXXXXX-X
  const handleCnicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 13);
    if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
    if (val.length > 13) val = val.slice(0, 13) + '-' + val.slice(13);
    setForm((prev) => ({ ...prev, cnic: val }));
  };

  // Phone formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
    setForm((prev) => ({ ...prev, phone: val }));
  };

  const validate = (): string | null => {
    if (!form.name.trim() || form.name.trim().length < 2) return 'Name must be at least 2 characters';
    if (!form.cnic || form.cnic.replace(/\D/g, '').length !== 13) return 'CNIC must be 13 digits (XXXXX-XXXXXXX-X)';
    if (!form.phone || form.phone.length !== 11 || !form.phone.startsWith('03')) return 'Phone must be 11 digits starting with 03';
    if (!form.salary || parseFloat(form.salary) <= 0) return 'Salary must be greater than 0';
    if (!form.joiningDate) return 'Joining date is required';
    if (!form.address.trim()) return 'Address is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/hostels/${hostelId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          salary: parseFloat(form.salary),
          foodAllowance: parseFloat(form.foodAllowance) || 0,
          cnic: form.cnic.replace(/\D/g, ''),
        }),
      });

      if (res.ok) {
        router.push(`/hostel/${hostelId}/staff`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add staff member');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Monthly cost calculation
  const monthlySalary = parseFloat(form.salary) || 0;
  const foodCost = form.freeFood ? 0 : (parseFloat(form.foodAllowance) || 0);
  const totalMonthlyCost = monthlySalary + foodCost;

  return (
    <DashboardLayout title="Add Staff" hostelId={hostelId}>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="page-title">Add Staff Member</h1>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm font-medium animate-scale-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div className="card">
            <h2 className="text-base font-bold text-text-primary dark:text-white mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Full Name *</label>
                <input type="text" name="name" value={form.name} onChange={handleChange} className="input" required placeholder="Enter full name" />
              </div>
              <div>
                <label className="label">CNIC *</label>
                <input type="text" name="cnic" value={form.cnic} onChange={handleCnicChange} className="input" required placeholder="35202-1234567-1" maxLength={15} />
                <p className="text-[10px] text-text-muted mt-1">13-digit CNIC number</p>
              </div>
              <div>
                <label className="label">Phone *</label>
                <input type="text" name="phone" value={form.phone} onChange={handlePhoneChange} className="input" required placeholder="03001234567" maxLength={11} />
                <p className="text-[10px] text-text-muted mt-1">11-digit mobile number starting with 03</p>
              </div>
              <div>
                <label className="label">Joining Date *</label>
                <input type="date" name="joiningDate" value={form.joiningDate} onChange={handleChange} className="input" required />
              </div>
              <div className="md:col-span-2">
                <label className="label">Address *</label>
                <textarea name="address" value={form.address} onChange={handleChange} className="textarea" required rows={2} placeholder="Full home address" />
              </div>
            </div>
          </div>

          {/* Job Info */}
          <div className="card">
            <h2 className="text-base font-bold text-text-primary dark:text-white mb-4">Job Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Staff Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STAFF_TYPES.map((type) => {
                    const Icon = type.icon;
                    const selected = form.staffType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, staffType: type.value }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                          selected
                            ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                            : 'border-border dark:border-[#1E2D42] hover:border-gray-300 text-text-secondary'
                        }`}
                      >
                        <Icon size={14} />
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="label">Shift *</label>
                <select name="shift" value={form.shift} onChange={handleChange} className="select" required>
                  {SHIFTS.map((shift) => (
                    <option key={shift.value} value={shift.value}>{shift.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Monthly Salary (PKR) *</label>
                <input type="number" name="salary" value={form.salary} onChange={handleChange} className="input" required min="1" placeholder="e.g., 15000" />
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="card">
            <h2 className="text-base font-bold text-text-primary dark:text-white mb-4">Staff Benefits</h2>
            <div className="space-y-5">
              {/* Free Accommodation */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-[#0B1222] border border-border dark:border-[#1E2D42]">
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    name="freeAccommodation"
                    checked={form.freeAccommodation}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Home size={16} className="text-indigo-500" />
                    <span className="text-sm font-bold text-text-primary dark:text-white">Free Accommodation</span>
                  </div>
                  <p className="text-xs text-text-muted">Staff member lives in the hostel for free (e.g., security guard, warden)</p>
                  {form.freeAccommodation && (
                    <div className="mt-3">
                      <label className="label">Room Number (optional)</label>
                      <input
                        type="text"
                        name="roomNumber"
                        value={form.roomNumber}
                        onChange={handleChange}
                        className="input !w-48"
                        placeholder="e.g., G-01 (Guard Room)"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Free Food */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-[#0B1222] border border-border dark:border-[#1E2D42]">
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    name="freeFood"
                    checked={form.freeFood}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <UtensilsCrossed size={16} className="text-emerald-500" />
                    <span className="text-sm font-bold text-text-primary dark:text-white">Free Mess Food</span>
                  </div>
                  <p className="text-xs text-text-muted">Staff eats at hostel mess for free (e.g., cook, full-time security)</p>
                  {!form.freeFood && (
                    <div className="mt-3">
                      <label className="label">Food Allowance (PKR/month)</label>
                      <input
                        type="number"
                        name="foodAllowance"
                        value={form.foodAllowance}
                        onChange={handleChange}
                        className="input !w-48"
                        placeholder="0"
                        min="0"
                      />
                      <p className="text-[10px] text-text-muted mt-1">Set to 0 if no food benefit. This is added to salary.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="card">
            <h2 className="text-base font-bold text-text-primary dark:text-white mb-4">Emergency Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Contact Name</label>
                <input type="text" name="emergencyContact" value={form.emergencyContact} onChange={handleChange} className="input" placeholder="Emergency contact name" />
              </div>
              <div>
                <label className="label">Contact Phone</label>
                <input type="text" name="emergencyPhone" value={form.emergencyPhone} onChange={handleChange} className="input" placeholder="03XXXXXXXXX" maxLength={11} />
              </div>
            </div>
          </div>

          {/* Cost Summary */}
          <div className="card !bg-primary/5 dark:!bg-primary/10 !border-primary/20">
            <h2 className="text-base font-bold text-primary mb-3">Monthly Cost Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary dark:text-slate-400">Base Salary</span>
                <span className="font-semibold">{formatCurrency(monthlySalary)}</span>
              </div>
              {form.freeAccommodation && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Free Accommodation</span>
                  <span className="font-semibold">Included</span>
                </div>
              )}
              {form.freeFood ? (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Free Mess Food</span>
                  <span className="font-semibold">Included</span>
                </div>
              ) : foodCost > 0 ? (
                <div className="flex justify-between">
                  <span className="text-text-secondary dark:text-slate-400">Food Allowance</span>
                  <span className="font-semibold">{formatCurrency(foodCost)}</span>
                </div>
              ) : null}
              <div className="flex justify-between pt-2 border-t border-primary/20 text-base">
                <span className="font-bold text-text-primary dark:text-white">Total Monthly Cost</span>
                <span className="font-bold text-primary">{formatCurrency(totalMonthlyCost)}</span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              <Save size={16} />
              {loading ? 'Saving...' : 'Add Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
