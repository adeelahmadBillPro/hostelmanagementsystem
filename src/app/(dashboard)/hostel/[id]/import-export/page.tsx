"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useToast } from "@/components/providers";
import {
  Upload,
  Download,
  FileSpreadsheet,
  Users,
  DoorOpen,
  UtensilsCrossed,
  CreditCard,
  Receipt,
  ShieldCheck,
  Wallet,
  Loader2,
  CheckCircle2,
  XCircle,
  FileDown,
  FileUp,
} from "lucide-react";

interface ImportResult {
  success: number;
  failed: { row: number; error: string }[];
  total: number;
}

function ImportCard({
  title,
  description,
  icon: Icon,
  iconColor,
  templateType,
  importUrl,
  hostelId,
}: {
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  templateType: string;
  importUrl: string;
  hostelId: string;
}) {
  const { addToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/hostels/${hostelId}/import/template?type=${templateType}`
      );
      if (!res.ok) throw new Error("Failed to download template");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${templateType}-import-template.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast("Template downloaded", "success");
    } catch {
      addToast("Failed to download template", "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(importUrl, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
        if (data.success > 0) {
          addToast(`${data.success} of ${data.total} records imported successfully`, "success");
        }
        if (data.failed?.length > 0) {
          addToast(`${data.failed.length} records failed`, "warning");
        }
      } else {
        addToast(data.error || "Import failed", "error");
      }
    } catch {
      addToast("Import failed", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${iconColor}15` }}
        >
          <Icon size={24} style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleDownloadTemplate}
          disabled={downloading}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          {downloading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileDown size={14} />
          )}
          Download Template
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn-primary text-sm flex items-center gap-2"
        >
          {uploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileUp size={14} />
          )}
          {uploading ? "Importing..." : "Import File"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="border border-gray-200 dark:border-[#1E2D42] rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-[#0B1222]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 size={16} />
              <span className="text-sm font-semibold">{result.success} Imported</span>
            </div>
            {result.failed.length > 0 && (
              <div className="flex items-center gap-2 text-red-500">
                <XCircle size={16} />
                <span className="text-sm font-semibold">{result.failed.length} Failed</span>
              </div>
            )}
            <span className="text-xs text-gray-400">of {result.total} total</span>
          </div>

          {result.failed.length > 0 && (
            <div className="max-h-40 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-slate-400">
                    <th className="pb-1 pr-4">Row</th>
                    <th className="pb-1">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.failed.map((f, i) => (
                    <tr key={i} className="text-red-500 dark:text-red-400">
                      <td className="pr-4 py-0.5 font-mono">{f.row}</td>
                      <td className="py-0.5">{f.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExportCard({
  title,
  description,
  icon: Icon,
  iconColor,
  exportType,
  hostelId,
}: {
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  exportType: string;
  hostelId: string;
}) {
  const { addToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/hostels/${hostelId}/export/${exportType}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportType}-export-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast(`${title} exported successfully`, "success");
    } catch {
      addToast("Export failed", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${iconColor}15` }}
        >
          <Icon size={24} style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{description}</p>
        </div>
      </div>
      <div className="mt-4">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-success text-sm flex items-center gap-2"
        >
          {exporting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          {exporting ? "Exporting..." : "Export to Excel"}
        </button>
      </div>
    </div>
  );
}

export default function ImportExportPage() {
  const params = useParams();
  const hostelId = params.id as string;

  return (
    <DashboardLayout title="Import / Export" hostelId={hostelId}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Import / Export Center
          </h2>
          <p className="text-gray-500 dark:text-slate-400 mt-1">
            Import data from Excel files or export your hostel data
          </p>
        </div>

        {/* Import Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Upload size={18} className="text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Import Data
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            <ImportCard
              title="Import Residents"
              description="Upload an Excel file with resident details. Each row will create a new user account and assign them to a bed."
              icon={Users}
              iconColor="#34D399"
              templateType="residents"
              importUrl={`/api/hostels/${hostelId}/import/residents`}
              hostelId={hostelId}
            />
            <ImportCard
              title="Import Rooms"
              description="Upload rooms with building, floor, type, and beds. Buildings and floors will be auto-created if they don't exist."
              icon={DoorOpen}
              iconColor="#60A5FA"
              templateType="rooms"
              importUrl={`/api/hostels/${hostelId}/import/rooms`}
              hostelId={hostelId}
            />
            <ImportCard
              title="Import Food Menu"
              description="Upload menu items with meal type, rate, category, and available days. Items will be added to your food menu."
              icon={UtensilsCrossed}
              iconColor="#FBBF24"
              templateType="menu"
              importUrl={`/api/hostels/${hostelId}/import/menu`}
              hostelId={hostelId}
            />
          </div>
        </div>

        {/* Export Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Download size={18} className="text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Export Data
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ExportCard
              title="Residents"
              description="Export all resident data including room assignments, contact info, and status."
              icon={Users}
              iconColor="#34D399"
              exportType="residents"
              hostelId={hostelId}
            />
            <ExportCard
              title="Payments"
              description="Export all payment records with dates, amounts, methods, and bill references."
              icon={CreditCard}
              iconColor="#22D3EE"
              exportType="payments"
              hostelId={hostelId}
            />
            <ExportCard
              title="Bills"
              description="Export all monthly bills with detailed charge breakdowns and payment status."
              icon={Receipt}
              iconColor="#F472B6"
              exportType="bills"
              hostelId={hostelId}
            />
            <ExportCard
              title="Rooms"
              description="Export all rooms with building, floor, type, beds, and occupancy details."
              icon={DoorOpen}
              iconColor="#60A5FA"
              exportType="rooms"
              hostelId={hostelId}
            />
            <ExportCard
              title="Staff"
              description="Export staff list with type, contact, salary, shift, and joining dates."
              icon={ShieldCheck}
              iconColor="#818CF8"
              exportType="staff"
              hostelId={hostelId}
            />
            <ExportCard
              title="Expenses"
              description="Export all hostel expenses with categories, dates, and amounts."
              icon={Wallet}
              iconColor="#FB923C"
              exportType="expenses"
              hostelId={hostelId}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
