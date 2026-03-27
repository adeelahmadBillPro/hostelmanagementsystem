"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Mail,
  ArrowRight,
  ArrowLeft,
  Shield,
  KeyRound,
  CheckCircle2,
  Copy,
  Loader2,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [resetToken, setResetToken] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setResetToken(data.token);
      setStep(2);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(resetToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden flex-col justify-between p-12">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl animate-float" />
          <div
            className="absolute top-1/3 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute bottom-0 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "2s" }}
          />
          {/* Grid pattern */}
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
            Forgot Your
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-300">
              Password?
            </span>
          </h1>

          <p className="text-indigo-200 text-lg mb-12 max-w-md opacity-0 animate-fade-in-up delay-200">
            No worries! We will help you reset your password and get back to managing your hostels.
          </p>

          {/* Steps */}
          <div className="space-y-4">
            {[
              { icon: Mail, text: "Enter your registered email", delay: 300 },
              { icon: KeyRound, text: "Get your reset token", delay: 400 },
              { icon: Shield, text: "Set a new secure password", delay: 500 },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-3 opacity-0 animate-slide-in-left"
                style={{ animationDelay: `${feature.delay}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <feature.icon size={18} className="text-amber-300" />
                </div>
                <span className="text-indigo-100 text-sm font-medium">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-indigo-300/50 text-sm opacity-0 animate-fade-in delay-700">
          Secure password recovery
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

          {step === 1 ? (
            <>
              <div className="opacity-0 animate-fade-in-up">
                <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-6">
                  <KeyRound size={28} className="text-amber-500" />
                </div>
                <h2 className="text-[28px] font-bold text-text-primary dark:text-white mb-2">
                  Reset Password
                </h2>
                <p className="text-text-secondary dark:text-gray-400 mb-8">
                  Enter the email address linked to your account and we will generate a reset token.
                </p>
              </div>

              {error && (
                <div className="bg-danger-light dark:bg-red-900/20 border border-danger/20 text-danger-dark dark:text-red-300 text-sm px-4 py-3 rounded-lg mb-6 animate-scale-in">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="opacity-0 animate-fade-in-up delay-100">
                  <label className="label">Email Address</label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      className="input pl-10"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full h-11 opacity-0 animate-fade-in-up delay-200 group"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Send Reset Token
                      <ArrowRight
                        size={18}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </span>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-text-secondary dark:text-gray-400 opacity-0 animate-fade-in delay-300">
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
            <>
              <div className="opacity-0 animate-fade-in-up">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mb-6">
                  <CheckCircle2 size={28} className="text-emerald-500" />
                </div>
                <h2 className="text-[28px] font-bold text-text-primary dark:text-white mb-2">
                  Token Generated
                </h2>
                <p className="text-text-secondary dark:text-gray-400 mb-6">
                  A password reset token has been generated for{" "}
                  <span className="font-semibold text-text-primary dark:text-white">
                    {email}
                  </span>
                </p>
              </div>

              {/* Token display (for testing) */}
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 mb-6 animate-fade-in-up delay-100">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
                  Reset Token (for testing only)
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white dark:bg-[#0B1929] px-3 py-2 rounded-lg font-mono text-text-primary dark:text-gray-300 overflow-x-auto break-all">
                    {resetToken}
                  </code>
                  <button
                    onClick={copyToken}
                    className="p-2 rounded-lg bg-white dark:bg-[#0B1929] hover:bg-gray-100 dark:hover:bg-[#111C2E] transition-colors flex-shrink-0"
                    title="Copy token"
                  >
                    {copied ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : (
                      <Copy size={16} className="text-text-muted" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-3 animate-fade-in-up delay-200">
                <Link
                  href={`/reset-password?token=${resetToken}`}
                  className="btn-primary w-full h-11 flex items-center justify-center gap-2 group"
                >
                  Reset Password Now
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </Link>

                <button
                  onClick={() => {
                    setStep(1);
                    setError("");
                    setResetToken("");
                  }}
                  className="btn-secondary w-full h-11"
                >
                  Try Different Email
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-text-secondary dark:text-gray-400 opacity-0 animate-fade-in delay-300">
                <Link
                  href="/login"
                  className="text-primary hover:text-primary-dark font-semibold transition-colors inline-flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
                  Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
