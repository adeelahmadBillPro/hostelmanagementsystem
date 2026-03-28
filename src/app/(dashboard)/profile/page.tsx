"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useToast } from "@/components/providers";
import { Lock, Eye, EyeOff, CheckCircle2, Save, User, Mail, Shield } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordChecks = [
    { label: "At least 8 characters", valid: newPassword.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(newPassword) },
    { label: "One lowercase letter", valid: /[a-z]/.test(newPassword) },
    { label: "One number", valid: /[0-9]/.test(newPassword) },
    { label: "Passwords match", valid: confirmPassword.length > 0 && newPassword === confirmPassword },
  ];

  const allValid = passwordChecks.every((c) => c.valid) && currentPassword.length > 0;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Password changed successfully!", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        addToast(data.error || "Failed to change password", "error");
      }
    } catch {
      addToast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Profile Settings">
      <div className="max-w-2xl space-y-6">
        <h1 className="page-title">Profile Settings</h1>

        {/* Account Info */}
        <div className="card">
          <h2 className="text-base font-bold text-text-primary dark:text-white mb-4">Account Information</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0B1222]">
              <User size={16} className="text-text-muted" />
              <div>
                <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Name</p>
                <p className="text-sm font-medium text-text-primary dark:text-white">{session?.user?.name || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0B1222]">
              <Mail size={16} className="text-text-muted" />
              <div>
                <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Email</p>
                <p className="text-sm font-medium text-text-primary dark:text-white">{session?.user?.email || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0B1222]">
              <Shield size={16} className="text-text-muted" />
              <div>
                <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Role</p>
                <p className="text-sm font-medium text-text-primary dark:text-white">{(session?.user as any)?.role?.replace(/_/g, " ") || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="card">
          <h2 className="text-base font-bold text-text-primary dark:text-white mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Enter current password"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="Enter new password"
                  required
                />
                <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Confirm new password"
                  required
                />
              </div>
            </div>

            {newPassword && (
              <div className="grid grid-cols-2 gap-2">
                {passwordChecks.map((check, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className={check.valid ? "text-emerald-500" : "text-slate-300"} />
                    <span className={`text-[11px] ${check.valid ? "text-emerald-600" : "text-text-muted"}`}>{check.label}</span>
                  </div>
                ))}
              </div>
            )}

            <button type="submit" disabled={loading || !allValid} className="btn-primary flex items-center gap-2">
              <Save size={16} />
              {loading ? "Changing..." : "Change Password"}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
