import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "./Button";

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
}

export function Modal({ title, children, onClose, width = "max-w-lg" }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-accent)]/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className={cn(
          "bg-[var(--color-surface)] rounded-none shadow-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-[var(--color-border)]",
          width
        )}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
          <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--color-accent)]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-none p-1 hover:bg-[var(--color-primary)] hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
      {/* Click outside to close */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
