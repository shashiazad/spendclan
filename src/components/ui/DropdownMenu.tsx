"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  icon?: ReactNode;
}

interface DropdownMenuProps {
  /** Accessible name for the trigger and the menu, e.g. "Group actions". */
  label: string;
  trigger: ReactNode;
  items: MenuItem[];
}

/** Overflow menu following the ARIA menu-button pattern (arrow keys, Escape, outside click). */
export function DropdownMenu({ label, trigger, items }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const closeOnOutside = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [open]);

  function closeAndReturnFocus() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const buttons = itemRefs.current.filter((b): b is HTMLButtonElement => b !== null);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (i: number) => buttons[(i + buttons.length) % buttons.length]?.focus();

    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusAt(index + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusAt(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusAt(buttons.length - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeAndReturnFocus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--sidebar-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
      >
        {trigger}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 mt-2 min-w-56 z-[var(--z-dropdown)] rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] p-1 shadow-[var(--shadow-lg)]"
        >
          {items.map((item, i) => (
            <button
              key={item.label}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                // Return focus to the trigger first, so a dialog opened by the item restores focus there
                closeAndReturnFocus();
                item.onSelect();
              }}
              className={`flex w-full min-h-[44px] items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-[var(--sidebar-hover)] focus:bg-[var(--sidebar-hover)] focus:outline-none ${
                item.tone === "danger" ? "text-[var(--expense)]" : "text-[var(--foreground)]"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
