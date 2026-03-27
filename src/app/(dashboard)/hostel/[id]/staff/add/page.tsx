'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { ArrowLeft, Save } from 'lucide-react';

const STAFF_TYPES = ['SECURITY', 'COOKING', 'LAUNDRY', 'CLEANING', 'MAINTENANCE'];
const SHIFTS = ['DAY', 'NIGHT', 'FULL'];

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
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/hostels/${hostelId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          salary: parseFloat(form.salary),
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

  return (
    <DashboardLayout title="Add Staff" hostelId={hostelId}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="page-title">Add Staff Member</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Full Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="input"
                required
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="label">CNIC *</label>
              <input
                type="text"
                name="cnic"
                value={form.cnic}
                onChange={handleChange}
                className="input"
                required
                placeholder="XXXXX-XXXXXXX-X"
              />
            </div>

            <div>
              <label className="label">Phone *</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="input"
                required
                placeholder="03XXXXXXXXX" maxLength={11}
              />
            </div>

            <div>
              <label className="label">Staff Type *</label>
              <select
                name="staffType"
                value={form.staffType}
                onChange={handleChange}
                className="select"
                required
              >
                {STAFF_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Shift *</label>
              <select
                name="shift"
                value={form.shift}
                onChange={handleChange}
                className="select"
                required
              >
                {SHIFTS.map((shift) => (
                  <option key={shift} value={shift}>
                    {shift}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Monthly Salary (PKR) *</label>
              <input
                type="number"
                name="salary"
                value={form.salary}
                onChange={handleChange}
                className="input"
                required
                min="0"
                placeholder="Enter salary amount"
              />
            </div>

            <div>
              <label className="label">Joining Date *</label>
              <input
                type="date"
                name="joiningDate"
                value={form.joiningDate}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">Address *</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                className="textarea"
                required
                rows={3}
                placeholder="Enter full address"
              />
            </div>

            <div>
              <label className="label">Emergency Contact Name</label>
              <input
                type="text"
                name="emergencyContact"
                value={form.emergencyContact}
                onChange={handleChange}
                className="input"
                placeholder="Emergency contact name"
              />
            </div>

            <div>
              <label className="label">Emergency Contact Phone</label>
              <input
                type="text"
                name="emergencyPhone"
                value={form.emergencyPhone}
                onChange={handleChange}
                className="input"
                placeholder="Emergency contact phone"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={16} />
              {loading ? 'Saving...' : 'Add Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
