"use client";

import { ChevronLeft, ChevronRight, Search, Inbox } from "lucide-react";
import { useState } from "react";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  actions?: (row: T) => React.ReactNode;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = "Search...",
  pageSize = 10,
  onRowClick,
  emptyMessage = "No data found",
  actions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = searchable
    ? data.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(search.toLowerCase())
        )
      )
    : data;

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="card p-0 overflow-hidden">
      {/* Search */}
      {searchable && (
        <div className="p-4 border-b border-border dark:border-[#1E2D42]">
          <div className="relative max-w-sm">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              className="input pl-10"
            />
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`table-header ${col.className || ""}`}>
                  {col.label}
                </th>
              ))}
              {actions && <th className="table-header text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-4 py-16 text-center"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#0B1222] flex items-center justify-center mb-3">
                      <Inbox size={22} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-sm font-medium text-text-muted">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr
                  key={i}
                  className={`table-row ${onRowClick ? "cursor-pointer" : ""} ${
                    i % 2 === 1 ? "bg-slate-50/50 dark:bg-white/[0.01]" : ""
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`table-cell ${col.className || ""}`}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="table-cell text-right" onClick={(e) => e.stopPropagation()}>
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden divide-y divide-border dark:divide-[#1E2D42]">
        {paginated.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#0B1222] flex items-center justify-center mb-3">
                <Inbox size={22} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-medium text-text-muted">{emptyMessage}</p>
            </div>
          </div>
        ) : (
          paginated.map((row, i) => (
            <div
              key={i}
              className={`p-4 space-y-2 transition-colors ${onRowClick ? "cursor-pointer active:bg-bg-main" : ""}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <div key={col.key} className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    {col.label}
                  </span>
                  <span className="text-sm text-text-primary dark:text-white">
                    {col.render ? col.render(row) : row[col.key]}
                  </span>
                </div>
              ))}
              {actions && (
                <div className="pt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                  {actions(row)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-border dark:border-[#1E2D42]">
          <span className="text-xs font-medium text-text-muted">
            Showing {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-bg-main dark:hover:bg-[#0B1222] disabled:opacity-30 transition-all duration-200"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    page === pageNum
                      ? "bg-primary text-white shadow-sm shadow-primary/25"
                      : "hover:bg-bg-main dark:hover:bg-[#0B1222] text-text-secondary"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-bg-main dark:hover:bg-[#0B1222] disabled:opacity-30 transition-all duration-200"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
