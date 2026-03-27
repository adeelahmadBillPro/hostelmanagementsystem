"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Phone,
  CheckCircle2,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const passwordChecks = [
    { label: "At least 6 characters", valid: formData.password.length >= 6 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(formData.password) },
    { label: "One number", valid: /[0-9]/.test(formData.password) },
    {
      label: "Passwords match",
      valid:
        formData.confirmPassword.length > 0 &&
        formData.password === formData.confirmPassword,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div
            className="absolute bottom-1/3 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "1.5s" }}
          />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16 opacity-0 animate-fade-in">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Building2 size={26} className="text-white" />
            </div>
            <span className="text-white font-bold text-2xl">HostelHub</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6 opacity-0 animate-fade-in-up delay-100">
            Start Managing
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">
              Your Hostels Today
            </span>
          </h1>

          <p className="text-indigo-200 text-lg mb-8 max-w-md opacity-0 animate-fade-in-up delay-200">
            Create your account and set up your first hostel in minutes.
            No credit card required.
          </p>

          {/* Steps */}
          <div className="space-y-4 opacity-0 animate-fade-in-up delay-300">
            {["Create your account", "Add your hostel details", "Start managing rooms & residents"].map(
              (text, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i < step
                        ? "bg-success text-white"
                        : i === step - 1
                        ? "bg-primary text-white"
                        : "bg-white/10 text-indigo-300"
                    }`}
                  >
                    {i < step - 1 ? <CheckCircle2 size={16} /> : i + 1}
                  </div>
                  <span className="text-indigo-100 text-sm">{text}</span>
                </div>
              )
            )}
          </div>
        </div>

        <p className="relative z-10 text-indigo-300/50 text-sm opacity-0 animate-fade-in delay-500">
          Join 500+ hostel owners across Pakistan
        </p>
      </div>

      {/* Right - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-[#0B1222]">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center gap-2 mb-8 lg:hidden opacity-0 animate-fade-in">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Building2 size={22} className="text-white" />
            </div>
            <span className="font-bold text-xl text-text-primary dark:text-white">
              HostelHub
            </span>
          </div>

          <div className="opacity-0 animate-fade-in-up">
            <h2 className="text-[28px] font-bold text-text-primary dark:text-white mb-2">
              Create Account
            </h2>
            <p className="text-text-secondary dark:text-gray-400 mb-8">
              Register as a hostel owner to get started
            </p>
          </div>

          {error && (
            <div className="bg-danger-light dark:bg-red-900/20 border border-danger/20 text-danger-dark dark:text-red-300 text-sm px-4 py-3 rounded-lg mb-6 animate-scale-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="opacity-0 animate-fade-in-up delay-100">
              <label className="label">Full Name</label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Enter your full name"
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            <div className="opacity-0 animate-fade-in-up delay-200">
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="Enter your email"
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            <div className="opacity-0 animate-fade-in-up delay-300">
              <label className="label">Phone Number</label>
              <div className="relative">
                <Phone
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="03XX-XXXXXXX"
                  className="input pl-10"
                />
              </div>
            </div>

            <div className="opacity-0 animate-fade-in-up delay-400">
              <label className="label">Password</label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Create a password"
                  className="input pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="opacity-0 animate-fade-in-up delay-500">
              <label className="label">Confirm Password</label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  placeholder="Confirm your password"
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            {/* Password strength */}
            {formData.password && (
              <div className="grid grid-cols-2 gap-2 animate-fade-in">
                {passwordChecks.map((check, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <CheckCircle2
                      size={14}
                      className={check.valid ? "text-success" : "text-text-muted"}
                    />
                    <span
                      className={`text-[11px] ${
                        check.valid ? "text-success-dark" : "text-text-muted"
                      }`}
                    >
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-11 mt-2 group"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create Account
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </span>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary dark:text-gray-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary hover:text-primary-dark font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
