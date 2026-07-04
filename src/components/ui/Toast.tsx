"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  addToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextType>({
  addToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const variantStyles: Record<ToastVariant, string> = {
  success: "border-[var(--income)]/25 bg-[var(--income-dim)] text-[var(--income)]",
  error:   "border-[var(--expense)]/25 bg-[var(--expense-dim)] text-[var(--expense)]",
  info:    "border-[var(--accent)]/25 bg-[var(--accent-dim)] text-[var(--accent)]",
};

const variantIcons: Record<ToastVariant, string> = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 bg-[var(--card)] shadow-[var(--shadow-lg)] ${variantStyles[toast.variant]}`}
            style={{ animation: "toast-in 0.3s ease-out" }}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-xs font-bold shrink-0">
              {variantIcons[toast.variant]}
            </span>
            <span className="text-xs font-medium text-[var(--foreground)]">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
