"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastVariant = "success" | "error" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  /** Optional button, e.g. "Undo" after a delete. */
  action?: ToastAction;
  durationMs?: number;
}

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}

interface ToastContextType {
  addToast: (message: string, variant?: ToastVariant, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType>({
  addToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const variantStyles: Record<ToastVariant, string> = {
  success: "border-[var(--income)]/40 text-[var(--income)]",
  error:   "border-[var(--expense)]/40 text-[var(--expense)]",
  info:    "border-[var(--accent)]/40 text-[var(--accent)]",
};

const variantIcons: Record<ToastVariant, string> = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = "success", options: ToastOptions = {}) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, variant, action: options.action }]);
      // Toasts with an action stay longer so there is time to use it
      setTimeout(() => dismiss(id), options.durationMs ?? (options.action ? 7000 : 3500));
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div role="status" aria-live="polite" className="fixed top-4 right-4 left-4 sm:left-auto z-[var(--z-toast)] flex flex-col items-end gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`glass pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 shadow-[var(--shadow-lg)] ${variantStyles[toast.variant]}`}
            style={{ animation: "toast-in 0.3s ease-out" }}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-xs font-bold shrink-0">
              {variantIcons[toast.variant]}
            </span>
            <span className="text-xs font-medium text-[var(--foreground)]">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
                className="ml-1 min-h-[32px] rounded-md px-2.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-dim)]"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
