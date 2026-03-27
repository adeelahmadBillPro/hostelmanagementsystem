"use client";

export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-[2.5px]",
    lg: "w-12 h-12 border-[3px]",
  };

  return (
    <div
      className={`${sizes[size]} border-primary/20 border-t-primary rounded-full animate-spin`}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Spinner size="lg" />
          <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping" />
        </div>
        <p className="text-sm font-medium text-text-muted animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card overflow-hidden relative">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700/50" />
        <div className="flex-1 space-y-2.5">
          <div className="h-6 bg-slate-200 dark:bg-slate-700/50 rounded-lg w-20" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg w-28" />
        </div>
      </div>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent" style={{ backgroundSize: "200% 100%" }} />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 border-b border-border dark:border-[#1E2D42]">
        <div className="h-11 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-64" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-4 border-b border-slate-100 dark:border-[#1A2A3E]"
          style={{ opacity: 1 - i * 0.12 }}
        >
          <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded-lg w-1/4" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg w-1/5" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded-lg w-1/6" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg w-1/4" />
        </div>
      ))}
    </div>
  );
}
