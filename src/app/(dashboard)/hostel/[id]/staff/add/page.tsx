"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { copyToClipboard } from '@/lib/clipboard';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft, Save, Home, UtensilsCrossed, Shield, ChefHat, Shirt,
  Wrench, Sparkles, UserCog, Copy, CheckCircle2, KeyRound,
} from 'lucide-react';

const STAFF_TYPES = [
  { value: 'SECURITY',    label: 'Security Guard', icon: Shield,       color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'COOKING',     label: 'Cook / Chef',    icon: ChefHat,      color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { value: 'LAUNDRY',     label: 'Laundry',        icon: Shirt,        color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'CLEANING',    label: 'Cleaning',       icon: Sparkles,     color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { value: 'MAINTENANCE', label: 'Maintenance',    icon: Wrench,       color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'ADMIN_STAFF', label: 'Admin Staff',    icon: UserCog,      color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
];

const SHIFTS = [
  { value: 'DAY',   label: 'Day Shift (8AM – 8PM)' },
  { value: 'NIGHT', label: 'Night Shift (8PM – 8AM)' },
  { value: 'FULL',  label: 'Full Time (24hr on-call)' },
];

export default function AddStaffPage() {
  const params   = useParams();
  const router   = useRouter();
  const hostelId = params.id as string;

  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied]         = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
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
    foodAllowance: '0',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const value  = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
    setForm((prev) => ({ ...prev, [target.name]: value }));
  };

  const handleCnicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 13);
    if (val.length > 5)  val = val.slice(0, 5)  + '-' + val.slice(5);
    if (val.length > 13) val = val.slice(0, 13) + '-' + val.slice(13);
    setForm((prev) => ({ ...prev, cnic: val }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
    setForm((prev) => ({ ...prev, phone: val }));
  };

  const validate = (): string | null => {
    if (!form.name.trim() || form.name.trim().length < 2)  return 'Name must be at least 2 characters';
    if (!form.cnic || form.cnic.replace(/\D/g, '').length !== 13) return 'CNIC must be 13 digits (XXXXX-XXXXXXX-X)';
    if (!form.phone || form.phone.length !== 11 || !form.phone.startsWith('03'))
      return 'Phone must be 11 digits starting with 03';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return 'Please enter a valid email address';
    if (!form.salary || parseFloat(form.salary) <= 0) return 'Salary must be greater than 0';
    if (!form.joiningDate) return 'Joining date is required';
    if (!form.address.trim()) return 'Address is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);

    try {
      const res = await fetch(`/api/hostels/${hostelId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          email: form.email.trim() || undefined,
          salary: parseFloat(form.salary),
          foodAllowance: parseFloat(form.foodAllowance) || 0,
          cnic: form.cnic.replace(/\D/g, ''),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.credentials) {
          setCredentials(data.credentials);
        } else {
          router.push(`/hostel/${hostelId}/staff`);
        }
      } else {
        setError(data.error || 'Failed to add staff member');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    copyToClipboard(`Email: ${credentials.email}\nPassword: ${credentials.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const monthlySalary   = parseFloat(form.salary) || 0;
  const foodCost        = form.freeFood ? 0 : (parseFloat(form.foodAllowance) || 0);
  const totalMonthlyCost = monthlySalary + foodCost;

  // —— Credentials Modal ——————————————————————————————————————————————————
  if (credentials) {
    return (
      <DashboardLayout title="Staff Added" hostelId={hostelId}>
        <div className="max-w-lg mx-auto">
          <div className="card text-center py-10 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-2">Staff Added!</h2>
            <p className="text-text-muted dark:text-slate-400 mb-6">
              A portal login account has been created. Share these credentials with the staff member.
            </p>

            <div className="bg-bg-main dark:bg-[#0B1222] rounded-xl p-5 border border-border dark:border-[#1E2D42] text-left mb-6">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound size={16} className="text-primary" />
                <span className="text-sm font-semibold text-text-primary dark:text-white">Login Credentials</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-text-muted dark:text-slate-400">Email</p>
                  <p className="text-sm font-mono font-semibold text-text-primary dark:text-white">{credentials.email}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted dark:text-slate-400">Password</p>
                  <p className="text-sm font-mono font-semibold text-text-primary dark:text-white">{credentials.password}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={copyCredentials} className="btn-secondary flex items-center gap-2">
                {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Credentials'}
              </button>
              <button onClick={() => router.push(`/hostel/${hostelId}/staff`)} className="btn-primary">
                Go to Staff List
              </button>
            </div>
            <p className="text-xs text-text-muted dark:text-slate-500 mt-4">
              Staff should change their password after first login.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Add Staff Member" hostelId={hostelId}>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Staff
        </button>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Staff Type */}
          <div className="card">
            <h3 className="text-base font-semibold text-text-primary dark:text-white mb-4">Staff Type</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STAFF_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, staffType: type.value }))}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      form.staffType === type.value
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-border dark:border-[#1E2D42] hover:border-primary/40'
                    }`}
                  >
                    <span className={`p-2 rounded-lg ${type.color}`}>
                      <Icon size={16} />
                    </span>
                    <span className={`text-sm font-medium ${form.staffType === type.value ? 'text-primary' : 'text-text-primary dark:text-white'}`}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Personal Info */}
          <div className="card space-y-4">
            <h3 className="text-base font-semibold text-text-primary dark:text-white">Personal Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name <span className="text-red-500">*</span></label>
                <input type="text" name="name" value={form.name} onChange={handleChange}
                  className="input" placeholder="Enter full name" />
              </div>
              <div>
                <label className="label">CNIC <span className="text-red-500">*</span></label>
                <input type="text" name="cnic" value={form.cnic} onChange={handleCnicChange}
                  className="input" placeholder="35202-1234567-1" maxLength={15} />
              </div>
              <div>
                <label className="label">Phone <span className="text-red-500">*</span></label>
                <input type="text" name="phone" value={form.phone} onChange={handlePhoneChange}
                  className="input" placeholder="03001234567" maxLength={11} />
              </div>
              <div>
                <label className="label">
                  Email
                  <span className="text-xs text-text-muted dark:text-slate-400 ml-1">(optional — enables portal login)</span>
                </label>
                <input type="email" name="email" value={form.email} onChange={handleChange}
                  className="input" placeholder="staff@example.com" />
              </div>
            </div>

            <div>
              <label className="label">Home Address <span className="text-red-500">*</span></label>
              <textarea name="address" value={form.address} onChange={handleChange}
                className="input min-h-[70px] resize-none" rows={2} placeholder="Full home address" />
            </div>
          </div>

          {/* Job Info */}
          <div className="card space-y-4">
            <h3 className="text-base font-semibold text-text-primary dark:text-white">Job Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Shift <span className="text-red-500">*</span></label>
                <select name="shift" value={form.shift} onChange={handleChange} className="select">
                  {SHIFTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Monthly Salary (PKR) <span className="text-red-500">*</span></label>
                <input type="number" name="salary" value={form.salary} onChange={handleChange}
                  className="input" placeholder="0" min="0" step="100" />
              </div>
              <div>
                <label className="label">Joining Date <span className="text-red-500">*</span></label>
                <input type="date" name="joiningDate" value={form.joiningDate} onChange={handleChange}
                  className="input" max={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="card space-y-4">
            <h3 className="text-base font-semibold text-text-primary dark:text-white">Benefits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="freeAccommodation" checked={form.freeAccommodation}
                  onChange={handleChange} className="w-4 h-4 rounded" />
                <div className="flex items-center gap-2">
                  <Home size={16} className="text-primary" />
                  <span className="text-sm text-text-primary dark:text-white">Free Accommodation</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="freeFood" checked={form.freeFood}
                  onChange={handleChange} className="w-4 h-4 rounded" />
                <div className="flex items-center gap-2">
                  <UtensilsCrossed size={16} className="text-primary" />
                  <span className="text-sm text-text-primary dark:text-white">Free Food / Mess</span>
                </div>
              </label>
            </div>
            {form.freeAccommodation && (
              <div>
                <label className="label">Room Number (if applicable)</label>
                <input type="text" name="roomNumber" value={form.roomNumber} onChange={handleChange}
                  className="input" placeholder="e.g. 101-A" />
              </div>
            )}
            {!form.freeFood && (
              <div>
                <label className="label">Monthly Food Allowance (PKR)</label>
                <input type="number" name="foodAllowance" value={form.foodAllowance} onChange={handleChange}
                  className="input" placeholder="0" min="0" step="100" />
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          <div className="card space-y-4">
            <h3 className="text-base font-semibold text-text-primary dark:text-white">Emergency Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Contact Name</label>
                <input type="text" name="emergencyContact" value={form.emergencyContact} onChange={handleChange}
                  className="input" placeholder="Next of kin name" />
              </div>
              <div>
                <label className="label">Contact Phone</label>
                <input type="text" name="emergencyPhone" value={form.emergencyPhone} onChange={handleChange}
                  className="input" placeholder="03001234567" maxLength={11} />
              </div>
            </div>
          </div>

          {/* Cost Summary */}
          {monthlySalary > 0 && (
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4">
              <p className="text-sm font-semibold text-text-primary dark:text-white mb-1">Estimated Monthly Cost</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalMonthlyCost)}</p>
              <p className="text-xs text-text-muted dark:text-slate-400 mt-1">
                Salary: {formatCurrency(monthlySalary)}
                {foodCost > 0 && ` + Food Allowance: ${formatCurrency(foodCost)}`}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {loading ? 'Adding...' : 'Add Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
