"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { ExpenseList, type ListExpense } from "@/components/groups/ExpenseList";
import { formatCurrency } from "@/lib/constants";
import { activeFilterCount, type UrlFilters } from "@/lib/search-url";
import type { ExpenseSearchResult } from "./hooks";

interface ExpenseSearchResultsProps {
  search: ExpenseSearchResult;
  filters: UrlFilters;
  currency: string;
  currentUserId?: string;
  onClear: () => void;
  showGroup?: boolean;
  pending?: string | null;
  onEdit?: (expense: ListExpense) => void;
  onDelete?: (expense: ListExpense) => void;
  headingLevel?: 2 | 3;
}

function Skeleton() {
  return (
    <div aria-hidden="true" className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3.5">
          <div className="h-11 w-11 rounded-xl bg-[var(--sidebar-hover)]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 rounded bg-[var(--sidebar-hover)]" />
            <div className="h-2.5 w-1/3 rounded bg-[var(--sidebar-hover)]" />
          </div>
          <div className="h-3 w-16 rounded bg-[var(--sidebar-hover)]" />
        </div>
      ))}
    </div>
  );
}

/** One page of search results at a time; more load as you reach the end. */
export function ExpenseSearchResults({
  search,
  filters,
  currency,
  currentUserId,
  onClear,
  showGroup,
  pending = null,
  onEdit,
  onDelete,
  headingLevel,
}: ExpenseSearchResultsProps) {
  const sentinel = useRef<HTMLDivElement>(null);
  const { items, totalCount, totalAmountMinor, loading, loadingMore, error, nextCursor, loadMore, reload } = search;

  // Infinite scroll: load the next page when the end of the list comes into view
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !nextCursor) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), { rootMargin: "400px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, loadMore]);

  const onlyText = activeFilterCount(filters) === 0 && filters.q.trim() !== "";
  const summary = loading
    ? "Searching…"
    : `${totalCount} ${totalCount === 1 ? "expense" : "expenses"} · ${formatCurrency(totalAmountMinor / 100, currency)}`;

  return (
    <div className="space-y-4">
      <p aria-live="polite" className="text-sm font-medium tabular-nums text-[var(--foreground-muted)]">
        {summary}
      </p>

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--expense)]/30 bg-[var(--expense-dim)] px-4 py-3 text-sm text-[var(--expense)]">
          {error}
          <Button size="sm" variant="secondary" onClick={reload}>Try again</Button>
        </div>
      )}

      {loading && items.length === 0 ? (
        <Skeleton />
      ) : !loading && items.length === 0 && !error ? (
        <div className="space-y-3 py-8 text-center">
          <p className="text-sm text-[var(--foreground-muted)]">
            {onlyText ? <>No expenses match &ldquo;{filters.q.trim()}&rdquo;.</> : "No expenses match these filters."}
          </p>
          <Button variant="secondary" onClick={onClear}>Clear filters</Button>
        </div>
      ) : (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={loading}>
          <ExpenseList
            expenses={items}
            currency={currency}
            currentUserId={currentUserId}
            pending={pending}
            onEdit={onEdit}
            onDelete={onDelete}
            highlight={filters.match === "starts" || filters.match === "contains" ? filters.q : undefined}
            showGroup={showGroup}
            headingLevel={headingLevel}
          />
        </div>
      )}

      {nextCursor && (
        <div ref={sentinel} className="flex justify-center pt-2">
          <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
            Load more ({items.length} of {totalCount})
          </Button>
        </div>
      )}
    </div>
  );
}
