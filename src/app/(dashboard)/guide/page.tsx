"use client";

import { useRef } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Download } from "lucide-react";

export default function GuidePage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleDownload = () => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  return (
    <DashboardLayout title="System Guide">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">System Guide</h1>
            <p className="text-sm text-text-muted mt-1">View or download as PDF</p>
          </div>
          <button onClick={handleDownload} className="btn-primary">
            <Download size={16} /> Download PDF
          </button>
        </div>
        <div className="card p-0 overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
          <iframe
            ref={iframeRef}
            src="/guide.html"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
