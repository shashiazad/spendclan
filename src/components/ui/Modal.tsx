"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0,
  );
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without re-running the focus effect on every parent render
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const opener = document.activeElement as HTMLElement | null;

    // Move focus inside: an element marked data-autofocus, else the first field in the body, else the dialog
    if (dialog && !dialog.contains(document.activeElement)) {
      const body = dialog.querySelector<HTMLElement>("[data-modal-body]");
      const target =
        dialog.querySelector<HTMLElement>("[data-autofocus]") ?? (body ? focusableIn(body)[0] : undefined);
      (target ?? dialog).focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;

      // Move focus ourselves so Tab / Shift+Tab cycle inside the dialog. Leaving it to the browser
      // escapes the dialog in Safari, whose default Tab order skips buttons and links.
      e.preventDefault();
      const items = focusableIn(dialog);
      if (items.length === 0) {
        dialog.focus();
        return;
      }
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey
        ? index <= 0 ? items.length - 1 : index - 1
        : index === -1 || index === items.length - 1 ? 0 : index + 1;
      items[next].focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      // Return focus to whatever opened the dialog
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl outline-none border border-[var(--border)] bg-[var(--surface-solid)] shadow-[var(--shadow-xl)] animate-scale-in ${sizeClasses[size]}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2
            id={titleId}
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
            aria-label="Close dialog"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div data-modal-body className="px-5 py-4">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ModalFooter({
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}) {
  return (
    <>
      <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button size="sm" onClick={onConfirm} loading={loading}>
        {confirmLabel}
      </Button>
    </>
  );
}
