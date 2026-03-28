"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Users,
  BarChart3,
  Utensils,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        const role = session?.user?.role;

        if (role === "SUPER_ADMIN") {
          router.push("/super-admin/dashboard");
        } else if (role === "RESIDENT" || role === "STAFF") {
          router.push("/portal/dashboard");
        } else {
          router.push("/dashboard");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding Panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: "linear-gradient(135deg, #0B1929 0%, #0F2235 40%, #162A45 100%)" }}
      >
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px] animate-float" />
          <div
            className="absolute top-1/4 right-[-5%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] animate-float"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute bottom-[-10%] left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] animate-float"
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
          {/* Radial center glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16 opacity-0 animate-fade-in">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-1 ring-white/10">
              <Building2 size={24} className="text-white" />
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">
              Hostel<span className="text-emerald-400">Hub</span>
            </span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-[1.15] mb-6 opacity-0 animate-fade-in-up delay-100">
            Manage Your
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
              Hostels Smarter
            </span>
          </h1>

          <p className="text-slate-400 text-lg mb-12 max-w-md opacity-0 animate-fade-in-up delay-200 leading-relaxed">
            Complete hostel management platform with rooms, billing, food,
            staff, and everything you need.
          </p>

          {/* Feature pills */}
          <div className="space-y-3">
            {[
              { icon: Shield, text: "Role-based access control", color: "text-blue-400", bg: "bg-blue-500/10 ring-blue-500/20", delay: 300 },
              { icon: Users, text: "Multi-hostel management", color: "text-emerald-400", bg: "bg-emerald-500/10 ring-emerald-500/20", delay: 400 },
              { icon: BarChart3, text: "Real-time analytics & reports", color: "text-purple-400", bg: "bg-purple-500/10 ring-purple-500/20", delay: 500 },
              { icon: Utensils, text: "Food menu & ordering system", color: "text-amber-400", bg: "bg-amber-500/10 ring-amber-500/20", delay: 600 },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-3 opacity-0 animate-slide-in-left"
                style={{ animationDelay: `${feature.delay}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl ${feature.bg} ring-1 flex items-center justify-center`}>
                  <feature.icon size={18} className={feature.color} />
                </div>
                <span className="text-slate-300 text-sm font-medium">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-slate-600 text-sm opacity-0 animate-fade-in delay-700">
          Trusted by 500+ hostels across Pakistan
        </p>
      </div>

      {/* Right - Login Form */}
      <div className="w-full lg:w-[48%] flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-[#0B1222]">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden opacity-0 animate-fade-in">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Building2 size={22} className="text-white" />
            </div>
            <span className="font-bold text-xl text-text-primary dark:text-white">
              Hostel<span className="text-emerald-500">Hub</span>
            </span>
          </div>

          <div className="opacity-0 animate-fade-in-up">
            <h2 className="text-[28px] font-bold text-text-primary dark:text-white mb-2 tracking-tight">
              Welcome back
            </h2>
            <p className="text-text-secondary dark:text-gray-400 mb-8">
              Sign in to your account to continue
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-danger-light dark:bg-red-900/20 border border-danger/20 text-danger-dark dark:text-red-300 text-sm px-4 py-3 rounded-xl mb-6 animate-scale-in">
              <p className="font-medium">{error}</p>
              {error.toLowerCase().includes("no account") && (
                <p className="mt-1.5 text-xs">
                  New hostel owner?{" "}
                  <a href="/register" className="font-bold underline hover:text-danger">
                    Register here to get started
                  </a>
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="opacity-0 animate-fade-in-up delay-100">
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="input pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="opacity-0 animate-fade-in-up delay-200">
              <label className="label">Password</label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors p-0.5"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between opacity-0 animate-fade-in-up delay-300">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 transition-colors"
                />
                <span className="text-sm text-text-secondary dark:text-gray-400 group-hover:text-text-primary dark:group-hover:text-gray-300 transition-colors">
                  Remember me
                </span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:text-primary-dark font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-12 text-[15px] opacity-0 animate-fade-in-up delay-400 group"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </span>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-text-secondary dark:text-gray-400 opacity-0 animate-fade-in delay-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-primary hover:text-primary-dark font-semibold transition-colors"
            >
              Sign up
            </Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-slate-50 dark:bg-indigo-900/10 rounded-2xl border border-slate-200/80 dark:border-indigo-800/20 opacity-0 animate-fade-in delay-600">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-primary" />
              <p className="text-xs font-semibold text-primary-dark dark:text-indigo-300">
                Demo Accounts
              </p>
            </div>
            <div className="space-y-1.5">
              {[
                { role: "Super Admin", email: "admin@hostelhub.com" },
                { role: "Tenant Admin", email: "tenant@hostelhub.com" },
                { role: "Manager", email: "manager@hostelhub.com" },
                { role: "Resident", email: "resident@hostelhub.com" },
              ].map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => {
                    setEmail(demo.email);
                    setPassword("password123");
                  }}
                  className="w-full flex items-center justify-between text-xs py-2 px-3 rounded-xl hover:bg-white dark:hover:bg-indigo-800/20 transition-all duration-200 group border border-transparent hover:border-slate-200 dark:hover:border-indigo-700/30"
                >
                  <span className="text-text-secondary dark:text-gray-400 font-medium">
                    {demo.role}
                  </span>
                  <span className="text-primary dark:text-indigo-300 font-semibold group-hover:underline">
                    {demo.email}
                  </span>
                </button>
              ))}
              <p className="text-[10px] text-text-muted mt-2 text-center">
                Password: password123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
