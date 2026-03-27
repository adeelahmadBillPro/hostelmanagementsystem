"use client";

import Modal from "./modal";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmVariant?: "danger" | "primary" | "success";
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  confirmVariant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const btnClass =
    confirmVariant === "danger"
      ? "btn-danger"
      : confirmVariant === "success"
      ? "btn-success"
      : "btn-primary";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-[420px]">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200 dark:ring-amber-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={20} className="text-amber-500" />
        </div>
        <p className="text-sm text-text-secondary dark:text-gray-300 mt-2 leading-relaxed">
          {message}
        </p>
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary" disabled={loading}>
          Cancel
        </button>
        <button onClick={onConfirm} className={btnClass} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            confirmText
          )}
        </button>
      </div>
    </Modal>
  );
}
