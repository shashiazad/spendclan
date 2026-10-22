"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAddExpense } from "@/components/groups/AddExpenseProvider";

/**
 * Floating "+" that adds a group expense. On a group page it targets that group;
 * elsewhere the dialog first asks which group the expense is for.
 */
export function QuickAddFAB() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { openAddExpense } = useAddExpense();
  // Tuck the button away while scrolling down so it doesn't sit on top of the content being read
  const [tucked, setTucked] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 8) return;
      setTucked(y > lastY && y > 80);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!session) return null;

  const currentGroupId = pathname.match(/^\/groups\/([^/]+)/)?.[1];

  return (
    <button
      type="button"
      onClick={() => openAddExpense(currentGroupId)}
      data-fab
      data-tucked={tucked || undefined}
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[var(--z-fab)] data-[tucked]:pointer-events-none data-[tucked]:translate-y-24 data-[tucked]:opacity-0 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[var(--shadow-lg)] transition-all duration-150 hover:bg-[var(--accent-hover)] active:scale-95 lg:bottom-8 lg:right-8"
      aria-label="Add group expense"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>
  );
}
