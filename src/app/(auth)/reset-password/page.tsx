"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Shield,
  CheckCircle2,
  KeyRound,
  Loader2,
} from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordChecks = [
    { label: "At least 6 characters", valid: password.length >= 6 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "One number", valid: /[0-9]/.test(password) },
    {
      label: "Passwords match",
      valid: confirmPassword.length > 0 && password === confirmPassword,
    },
  ];

  const allChecksPass = passwordChecks.every((c) => c.valid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is missing. Please use the link from your email.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }

      setSuccess(true);
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
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-float" />
          <div
            className="absolute bottom-1/3 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float"
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

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16 opacity-0 animate-fade-in">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Building2 size={26} className="text-white" />
            </div>
            <span className="text-white font-bold text-2xl">HostelHub</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6 opacity-0 animate-fade-in-up delay-100">
            Set Your
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">
              New Password
            </span>
          </h1>

          <p className="text-indigo-200 text-lg mb-12 max-w-md opacity-0 animate-fade-in-up delay-200">
            Choose a strong password to keep your account secure. Make it at least 6 characters long.
          </p>

          {/* Tips */}
          <div className="space-y-4">
            {[
              { icon: Shield, text: "Use a mix of letters and numbers", delay: 300 },
              { icon: KeyRound, text: "Avoid using common words", delay: 400 },
              { icon: Lock, text: "Never share your password", delay: 500 },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-3 opacity-0 animate-slide-in-left"
                style={{ animationDelay: `${feature.delay}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <feature.icon size={18} className="text-emerald-300" />
                </div>
                <span className="text-indigo-100 text-sm font-medium">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-indigo-300/50 text-sm opacity-0 animate-fade-in delay-700">
          Your data is encrypted and secure
        </p>
      </div>

      {/* Right - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-[#0B1222]">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden opacity-0 animate-fade-in">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Building2 size={22} className="text-white" />
            </div>
            <span className="font-bold text-xl text-text-primary dark:text-white">
              HostelHub
            </span>
          </div>

          {!success ? (
            <>
              <div className="opacity-0 animate-fade-in-up">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mb-6">
                  <Lock size={28} className="text-emerald-500" />
                </div>
                <h2 className="text-[28px] font-bold text-text-primary dark:text-white mb-2">
                  New Password
                </h2>
                <p className="text-text-secondary dark:text-gray-400 mb-8">
                  Enter your new password below. Make sure it is strong and secure.
                </p>
              </div>

              {!token && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-400 text-sm px-4 py-3 rounded-lg mb-6 animate-scale-in">
                  No reset token found. Please use the link from your email or go to{" "}
                  <Link href="/forgot-password" className="underline font-semibold">
                    Forgot Password
                  </Link>{" "}
                  to get one.
                </div>
              )}

              {error && (
                <div className="bg-danger-light dark:bg-red-900/20 border border-danger/20 text-danger-dark dark:text-red-300 text-sm px-4 py-3 rounded-lg mb-6 animate-scale-in">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="opacity-0 animate-fade-in-up delay-100">
                  <label className="label">New Password</label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="input pl-10 pr-10"
                      autoComplete="new-password"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="opacity-0 animate-fade-in-up delay-200">
                  <label className="label">Confirm Password</label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="input pl-10"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                {/* Password strength */}
                {password && (
                  <div className="grid grid-cols-2 gap-2 animate-fade-in">
                    {passwordChecks.map((check, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <CheckCircle2
                          size={14}
                          className={
                            check.valid ? "text-success" : "text-text-muted"
                          }
                        />
                        <span
                          className={`text-[11px] ${
                            check.valid
                              ? "text-success-dark dark:text-emerald-400"
                              : "text-text-muted"
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
                  disabled={loading || !allChecksPass || !token}
                  className="btn-primary w-full h-11 opacity-0 animate-fade-in-up delay-300 group disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      Resetting...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Reset Password
                      <ArrowRight
                        size={18}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </span>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-text-secondary dark:text-gray-400 opacity-0 animate-fade-in delay-400">
                <Link
                  href="/login"
                  className="text-primary hover:text-primary-dark font-semibold transition-colors inline-flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
                  Back to Sign In
                </Link>
              </p>
            </>
          ) : (
            <div className="text-center animate-fade-in-up">
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>
              <h2 className="text-[28px] font-bold text-text-primary dark:text-white mb-3">
                Password Reset!
              </h2>
              <p className="text-text-secondary dark:text-gray-400 mb-8 max-w-sm mx-auto">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
              <Link
                href="/login"
                className="btn-primary w-full h-11 flex items-center justify-center gap-2 group"
              >
                Go to Sign In
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0B1222]">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
