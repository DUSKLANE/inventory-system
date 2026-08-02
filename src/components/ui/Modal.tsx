"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, children, footer, width = "max-w-md" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const el = panelRef.current?.querySelector<HTMLElement>(
      "input, select, textarea, button, [tabindex]:not([tabindex='-1'])"
    );
    el?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="modal-backdrop absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${width} bg-white dark:bg-[var(--card)] border border-[var(--card-border)] rounded-lg shadow-xl animate-fade-in`}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--card-border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="p-1.5 rounded text-[var(--foreground-subtle)] hover:bg-[var(--background-subtle)] hover:text-[var(--foreground)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-[var(--card-border)] flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
