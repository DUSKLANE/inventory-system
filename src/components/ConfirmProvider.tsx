"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions { title: string; message: string; confirmText?: string; cancelText?: string; danger?: boolean }
type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
interface PendingConfirm extends ConfirmOptions { resolve: (v: boolean) => void }

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const confirmDialog = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => setPending({ ...options, resolve }));
  }, []);

  const close = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirmDialog}>
      {children}
      {pending && (
        <div className="fixed inset-0 modal-backdrop z-[150] flex items-center justify-center p-4 animate-fade-in" onClick={() => close(false)}>
          <div className="bg-white dark:bg-[var(--card)] rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${pending.danger ? "bg-red-100 dark:bg-red-500/20" : "bg-blue-100 dark:bg-blue-500/20"}`}>
                <AlertTriangle className={`w-5 h-5 ${pending.danger ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-[var(--card-foreground)]">{pending.title}</h3>
                <p className="text-sm text-gray-500 dark:text-[var(--foreground-subtle)] mt-1">{pending.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => close(false)} className="px-4 py-2 text-gray-700 dark:text-[var(--foreground-muted)] hover:bg-gray-100 dark:hover:bg-[var(--background-subtle)] rounded-lg transition-colors">
                {pending.cancelText || "取消"}
              </button>
              <button
                onClick={() => close(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${pending.danger ? "bg-red-500 text-white hover:bg-red-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              >
                {pending.confirmText || "确认"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() { return useContext(ConfirmContext); }
