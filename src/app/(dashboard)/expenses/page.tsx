"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useAddExpense } from "@/components/groups/AddExpenseProvider";
import { ExpenseSearchBar } from "@/components/search/ExpenseSearchBar";
import { ExpenseSearchResults } from "@/components/search/ExpenseSearchResults";
import { useExpenseSearch, useUrlFilters } from "@/components/search/hooks";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { NETWORK_ERROR, readError } from "@/lib/api-errors";
import type { Named } from "@/lib/search-tokens";
import { EMPTY_FILTERS } from "@/lib/search-url";
import { PageHeader } from "@/components/ui/PageHeader";

type GroupSummary = { id: string; name: string; members?: { user: { id: string; name: string } }[] };

function AllExpenses() {
  const { data: session } = useSession();
  const currency = session?.user?.currency ?? "INR";
  const userId = session?.user?.id;
  const { onExpenseAdded } = useAddExpense();
  const [filters, setFilters] = useUrlFilters();
  const search = useExpenseSearch("/api/expenses", filters);
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/groups")
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res, "Couldn't load your groups."));
        return res.json();
      })
      .then((data) => active && setGroups(data.groups ?? []))
      .catch((e) => active && setGroupsError(e instanceof Error ? e.message : NETWORK_ERROR));
    return () => {
      active = false;
    };
  }, []);

  const { reload } = search;
  useEffect(() => onExpenseAdded(() => reload()), [onExpenseAdded, reload]);

  const groupOptions: Named[] = useMemo(() => (groups ?? []).map((g) => ({ id: g.id, name: g.name })), [groups]);
  const people: Named[] = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups ?? []) for (const m of g.members ?? []) map.set(m.user.id, m.user.name);
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [groups]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Expenses" eyebrow="Across all your groups" description="Search every expense in the groups you're in." />

      {groupsError && <p role="alert" className="text-sm text-[var(--expense)]">{groupsError}</p>}

      <ExpenseSearchBar
        filters={filters}
        onChange={setFilters}
        people={people}
        groups={groupOptions}
        meId={userId}
        currency={currency}
        storageKey="all"
      />

      <ExpenseSearchResults
        search={search}
        filters={filters}
        currency={currency}
        currentUserId={userId}
        onClear={() => setFilters({ ...EMPTY_FILTERS })}
        showGroup
        headingLevel={2}
      />
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><LoadingSpinner /></div>}>
      <AllExpenses />
    </Suspense>
  );
}
