"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import FileUpload from "@/components/ui/file-upload";
import { useToast } from "@/components/providers";
import { formatDate } from "@/lib/utils";
import {
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  Heart,
  Building,
  BedDouble,
  Calendar,
  Save,
  Loader2,
  Eye,
  EyeOff,
  CreditCard,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cnic: string | null;
  role: string;
  image: string | null;
  createdAt: string;
  hostelId: string | null;
  hostel: { id: string; name: string } | null;
  resident: {
    id: string;
    emergencyContact: string | null;
    emergencyPhone: string | null;
    bloodGroup: string | null;
    medicalCondition: string | null;
    moveInDate: string;
    moveOutDate: string | null;
    photo: string | null;
    status: string;
    room: { roomNumber: string };
    bed: { bedNumber: string };
    hostel: { id: string; name: string };
  } | null;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Editable fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [medicalCondition, setMedicalCondition] = useState("");

  // Password
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const role = (session?.user as any)?.role || "";
  const isResident = role === "RESIDENT";

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        const user = data.user as UserProfile;
        setProfile(user);
        setName(user.name || "");
        setEmail(user.email || "");
        setPhone(user.phone || "");
        setImage(user.image || "");
        if (user.resident) {
          setEmergencyContact(user.resident.emergencyContact || "");
          setEmergencyPhone(user.resident.emergencyPhone || "");
          setBloodGroup(user.resident.bloodGroup || "");
          setMedicalCondition(user.resident.medicalCondition || "");
        }
      } else {
        addToast("Failed to load profile", "error");
      }
    } catch {
      addToast("Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      addToast("Name is required", "error");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      addToast("New passwords do not match", "error");
      return;
    }

    if (newPassword && !oldPassword) {
      addToast("Please enter your current password", "error");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      addToast("New password must be at least 6 characters", "error");
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        name: name.trim(),
        phone: phone.trim() || null,
        image: image || null,
      };

      if (!isResident) {
        payload.email = email.trim();
      }

      if (isResident) {
        payload.emergencyContact = emergencyContact.trim() || null;
        payload.emergencyPhone = emergencyPhone.trim() || null;
        payload.bloodGroup = bloodGroup.trim() || null;
        payload.medicalCondition = medicalCondition.trim() || null;
      }

      if (oldPassword && newPassword) {
        payload.oldPassword = oldPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        addToast("Profile updated successfully!", "success");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        fetchProfile();
      } else {
        addToast(data.error || "Failed to update profile", "error");
      }
    } catch {
      addToast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Profile Settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Profile Settings">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Profile Header */}
        <div className="card flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-shrink-0">
            {image ? (
              <img
                src={image}
                alt={name}
                className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold border-4 border-primary/20">
                {name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            )}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-text-primary dark:text-white">
              {profile?.name}
            </h2>
            <p className="text-sm text-text-muted dark:text-slate-400">
              {profile?.email}
            </p>
            <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary">
              {role.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-5 flex items-center gap-2">
              <User size={20} className="text-primary" />
              Basic Information
            </h3>
            <div className="space-y-4">
              {/* Profile Photo */}
              <div>
                <label className="label">Profile Photo (optional)</label>
                <FileUpload
                  onUpload={(url) => setImage(url)}
                  accept="image/*"
                  label="Upload profile photo"
                  currentUrl={image}
                  variant="avatar"
                />
              </div>

              {/* Name */}
              <div>
                <label className="label flex items-center gap-1.5">
                  <User size={14} />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input w-full"
                  placeholder="Your full name"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="label flex items-center gap-1.5">
                  <Mail size={14} />
                  Email {isResident && "(read-only)"}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`input w-full ${isResident ? "bg-gray-100 dark:bg-[#0B1222] cursor-not-allowed" : ""}`}
                  placeholder="Email address"
                  readOnly={isResident}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="label flex items-center gap-1.5">
                  <Phone size={14} />
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input w-full"
                  placeholder="03XX-XXXXXXX"
                />
              </div>

              {/* CNIC (readonly) */}
              {profile?.cnic && (
                <div>
                  <label className="label flex items-center gap-1.5">
                    <CreditCard size={14} />
                    CNIC (read-only)
                  </label>
                  <input
                    type="text"
                    value={profile.cnic}
                    className="input w-full bg-gray-100 dark:bg-[#0B1222] cursor-not-allowed"
                    readOnly
                  />
                </div>
              )}
            </div>
          </div>

          {/* Resident-specific or Readonly Info */}
          {isResident && profile?.resident ? (
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-5 flex items-center gap-2">
                <Heart size={20} className="text-red-500" />
                Resident Details
              </h3>
              <div className="space-y-4">
                {/* Emergency Contact */}
                <div>
                  <label className="label">Emergency Contact</label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="input w-full"
                    placeholder="Emergency contact name"
                  />
                </div>

                {/* Emergency Phone */}
                <div>
                  <label className="label">Emergency Phone</label>
                  <input
                    type="text"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="input w-full"
                    placeholder="Emergency contact phone"
                  />
                </div>

                {/* Blood Group */}
                <div>
                  <label className="label">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="select w-full"
                  >
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                {/* Medical Condition */}
                <div>
                  <label className="label">Medical Condition</label>
                  <textarea
                    value={medicalCondition}
                    onChange={(e) => setMedicalCondition(e.target.value)}
                    className="input w-full min-h-[80px] resize-none"
                    placeholder="Any medical conditions or allergies..."
                  />
                </div>

                {/* Readonly fields */}
                <div className="border-t border-border dark:border-[#1E2D42] pt-4 mt-4 space-y-3">
                  <p className="text-xs font-semibold text-text-muted dark:text-slate-500 uppercase tracking-wide">
                    Assignment Details (Read-only)
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label flex items-center gap-1.5">
                        <Building size={14} />
                        Hostel
                      </label>
                      <input
                        type="text"
                        value={profile.resident.hostel?.name || "-"}
                        className="input w-full bg-gray-100 dark:bg-[#0B1222] cursor-not-allowed text-sm"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="label flex items-center gap-1.5">
                        <BedDouble size={14} />
                        Room / Bed
                      </label>
                      <input
                        type="text"
                        value={`Room ${profile.resident.room?.roomNumber || "-"} / Bed ${profile.resident.bed?.bedNumber || "-"}`}
                        className="input w-full bg-gray-100 dark:bg-[#0B1222] cursor-not-allowed text-sm"
                        readOnly
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label flex items-center gap-1.5">
                      <Calendar size={14} />
                      Move-in Date
                    </label>
                    <input
                      type="text"
                      value={formatDate(profile.resident.moveInDate)}
                      className="input w-full bg-gray-100 dark:bg-[#0B1222] cursor-not-allowed text-sm"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Password change for non-residents shown in right column */
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-5 flex items-center gap-2">
                <Lock size={20} className="text-amber-500" />
                Change Password
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Current Password</label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? "text" : "password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="input w-full pr-10"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input w-full pr-10"
                      placeholder="Enter new password (min 6 chars)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input w-full"
                    placeholder="Confirm new password"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Password Section for Residents (shown below) */}
        {isResident && (
          <div className="card">
            <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-5 flex items-center gap-2">
              <Lock size={20} className="text-amber-500" />
              Change Password
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Current Password</label>
                <div className="relative">
                  <input
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="input w-full pr-10"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input w-full pr-10"
                    placeholder="Min 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input w-full"
                  placeholder="Confirm new password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => fetchProfile()}
            className="btn-secondary flex items-center gap-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
