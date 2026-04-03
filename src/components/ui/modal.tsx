"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-[560px]",
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className={`modal-content ${maxWidth} animate-slide-up`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-border dark:border-[#1E2D42] mb-5">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white pr-3">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-[#0B1222] transition-all duration-200 flex items-center justify-center group"
            aria-label="Close"
          >
            <X size={18} className="text-text-muted group-hover:text-danger transition-colors" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
