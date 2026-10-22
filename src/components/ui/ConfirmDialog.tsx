"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Input } from "./Input";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  loading?: boolean;
  /** When set, the user must type this text exactly before confirming (for destructive actions). */
  requireText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Accessible replacement for window.confirm(). Focus starts on Cancel (or the confirmation field). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  loading = false,
  requireText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const confirmed = !requireText || typed.trim() === requireText;

  function close() {
    setTyped("");
    onCancel();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={close} disabled={loading} data-autofocus={requireText ? undefined : true}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            size="sm"
            onClick={() => {
              onConfirm();
              setTyped("");
            }}
            loading={loading}
            disabled={!confirmed}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm text-[var(--foreground-muted)]">
        <div>{message}</div>
        {requireText && (
          <Input
            id="confirm-text"
            label={`Type "${requireText}" to confirm`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            data-autofocus
          />
        )}
      </div>
    </Modal>
  );
}
