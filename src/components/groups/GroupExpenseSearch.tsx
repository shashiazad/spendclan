"use client";

import { Suspense, useEffect, useRef, type ReactNode } from "react";
import { ExpenseSearchBar } from "@/components/search/ExpenseSearchBar";
import { ExpenseSearchResults } from "@/components/search/ExpenseSearchResults";
import { useExpenseSearch, useUrlFilters } from "@/components/search/hooks";
import type { Named } from "@/lib/search-tokens";
import { EMPTY_FILTERS, hasActiveFilters } from "@/lib/search-url";
import type { ListExpense } from "./ExpenseList";

interface GroupExpenseSearchProps {
  groupId: string;
  people: Named[];
  currentUserId?: string;
  currency: string;
  pending: string | null;
  onEdit: (expense: ListExpense) => void;
  onDelete: (expense: ListExpense) => void;
  /** Changes whenever the group's data was reloaded (after an add, edit or delete). */
  refreshKey: unknown;
  /** The full month-by-month list, shown while no search or filter is active. */
  children: ReactNode;
}

function GroupExpenseSearchInner({ groupId, people, currentUserId, currency, pending, onEdit, onDelete, refreshKey, children }: GroupExpenseSearchProps) {
  const [filters, setFilters] = useUrlFilters();
  const active = hasActiveFilters(filters) || filters.sort !== "newest";
  const search = useExpenseSearch(`/api/groups/${groupId}/expenses`, filters, active);

  // Re-run the search after the group's data changes, so edits and deletes show up in results
  const { reload } = search;
  const firstKey = useRef(refreshKey);
  useEffect(() => {
    if (refreshKey !== firstKey.current) reload();
  }, [refreshKey, reload]);

  return (
    <div className="space-y-4">
      <ExpenseSearchBar
        filters={filters}
        onChange={setFilters}
        people={people}
        meId={currentUserId}
        currency={currency}
        storageKey={groupId}
      />
      {active ? (
        <ExpenseSearchResults
          search={search}
          filters={filters}
          currency={currency}
          currentUserId={currentUserId}
          onClear={() => setFilters({ ...EMPTY_FILTERS })}
          pending={pending}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
        children
      )}
    </div>
  );
}

/** Search and filters for one group's expenses, kept in the URL. */
export function GroupExpenseSearch(props: GroupExpenseSearchProps) {
  // useSearchParams needs a Suspense boundary; until it resolves, show the plain list
  return (
    <Suspense fallback={props.children}>
      <GroupExpenseSearchInner {...props} />
    </Suspense>
  );
}
