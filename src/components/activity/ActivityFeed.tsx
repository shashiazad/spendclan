"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Button } from "@/components/ui/Button";
import { NETWORK_ERROR, readError } from "@/lib/api-errors";
import type { ActivityEvent } from "@/lib/activity";
import { formatCurrency } from "@/lib/constants";

/** Loads the activity feed (all groups, or one) with cursor paging. */
export function useActivity({ groupId, limit = 20, refreshKey }: { groupId?: string; limit?: number; refreshKey?: unknown } = {}) {
  const [items, setItems] = useState<ActivityEvent[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = useCallback(
    (cursor?: string | null) => {
      const p = new URLSearchParams({ limit: String(limit) });
      if (groupId) p.set("groupId", groupId);
      if (cursor) p.set("cursor", cursor);
      return `/api/activity?${p}`;
    },
    [groupId, limit],
  );

  useEffect(() => {
    let active = true;
    fetch(url())
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res, "Couldn't load activity."));
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setItems(data.items);
        setNextCursor(data.nextCursor);
        setError(null);
      })
      .catch((e) => active && setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : NETWORK_ERROR));
    return () => {
      active = false;
    };
  }, [url, refreshKey]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(url(nextCursor));
      if (!res.ok) throw new Error(await readError(res, "Couldn't load more activity."));
      const data = await res.json();
      setItems((prev) => [...(prev ?? []), ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : NETWORK_ERROR);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, url]);

  return { items, nextCursor, loadingMore, error, loadMore };
}

const ICONS: Record<ActivityEvent["type"], { path: string; tone: string }> = {
  expense_added: { path: "M12 4.5v15m7.5-7.5h-15", tone: "text-[var(--accent)] bg-[var(--accent-dim)]" },
  expense_edited: { path: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z", tone: "text-[var(--foreground-muted)] bg-[var(--surface)]" },
  expense_deleted: { path: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0", tone: "text-[var(--expense)] bg-[var(--expense-dim)]" },
  settlement: { path: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z", tone: "text-[var(--income)] bg-[var(--income-dim)]" },
  settlement_deleted: { path: "M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z", tone: "text-[var(--expense)] bg-[var(--expense-dim)]" },
  member_joined: { path: "M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z", tone: "text-[var(--accent)] bg-[var(--accent-dim)]" },
  member_removed: { path: "M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z", tone: "text-[var(--foreground-muted)] bg-[var(--surface)]" },
};

function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMM yyyy");
}

interface ActivityFeedProps {
  items: ActivityEvent[];
  currentUserId?: string;
  currency: string;
  /** Hide the group name (inside a group's own page). */
  hideGroup?: boolean;
  /** Day headings are h3 inside a tile; use 2 on the Activity page. */
  headingLevel?: 2 | 3;
}

/** Events grouped by day, newest first, each in one plain sentence. */
export function ActivityFeed({ items, currentUserId, currency, hideGroup = false, headingLevel = 3 }: ActivityFeedProps) {
  const DayHeading = headingLevel === 2 ? "h2" : "h3";
  const fmt = (n: number) => formatCurrency(n, currency);
  const who = (p: { id: string; name: string } | null | undefined, fallback = "Someone") => (!p ? fallback : p.id === currentUserId ? "You" : p.name);

  const days: { label: string; events: ActivityEvent[] }[] = [];
  for (const e of items) {
    const label = dayLabel(new Date(e.at));
    const last = days[days.length - 1];
    if (last?.label === label) last.events.push(e);
    else days.push({ label, events: [e] });
  }

  function describe(e: ActivityEvent): { text: ReactNode; detail?: ReactNode } {
    const q = (s: string) => <span className="font-medium text-[var(--foreground)]">“{s}”</span>;
    switch (e.type) {
      case "expense_added": {
        const x = e.expense!;
        const youPaid = x.paidBy.id === currentUserId;
        const lent = youPaid ? x.amount - x.yourShare : 0;
        return {
          text: <>{who(e.actor)} added {q(x.description)} · <span className="money">{fmt(x.amount)}</span></>,
          detail: youPaid
            ? lent > 0.004 && <span className="text-[var(--owed)]">+ you lent {fmt(lent)}</span>
            : x.yourShare > 0 && <span className="text-[var(--owe)]">− you owe {fmt(x.yourShare)}</span>,
        };
      }
      case "expense_edited":
        return { text: <>{who(e.actor)} edited {q(e.expense!.description)}</> };
      case "expense_deleted":
        return { text: <>{who(e.actor)} deleted {q(e.expense!.description)} · <span className="money">{fmt(e.expense!.amount)}</span></> };
      case "settlement": {
        const s = e.settlement!;
        return { text: <>{who(s.from)} paid {who(s.to).replace(/^You$/, "you")} <span className="money font-medium text-[var(--foreground)]">{fmt(s.amount)}</span></> };
      }
      case "settlement_deleted": {
        const s = e.settlement!;
        return { text: <>{who(e.actor)} removed a payment of <span className="money">{fmt(s.amount)}</span> from {who(s.from)} to {who(s.to)}</> };
      }
      case "member_joined":
        return { text: <>{who(e.member)} joined</> };
      case "member_removed":
        return { text: e.actor && e.actor.id === e.member?.id ? <>{who(e.member)} left</> : <>{who(e.actor)} removed {who(e.member)}</> };
    }
  }

  return (
    <div className="space-y-5">
      {days.map((day) => (
        <section key={day.label} aria-label={day.label}>
          <DayHeading className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--foreground-subtle)]">{day.label}</DayHeading>
          <ol className="space-y-3">
            {day.events.map((e) => {
              const icon = ICONS[e.type];
              const { text, detail } = describe(e);
              return (
                <li key={e.key} className="flex gap-3">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${icon.tone}`} aria-hidden="true">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon.path} />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1 text-sm text-[var(--foreground-muted)]">
                    <p className="break-words">{text}</p>
                    <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs">
                      {detail && <span className="money">{detail}</span>}
                      {!hideGroup && (
                        <Link href={`/groups/${e.group.id}`} className="font-medium text-[var(--accent)] hover:underline">
                          {e.group.name}
                        </Link>
                      )}
                      <time dateTime={e.at} className="text-[var(--foreground-subtle)]">{format(new Date(e.at), "HH:mm")}</time>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** Feed plus loading, empty, error and "Load more" states. */
export function ActivityPanel({
  activity,
  currentUserId,
  currency,
  hideGroup,
  headingLevel,
  emptyText = "No activity yet. Add an expense to get started.",
}: {
  activity: ReturnType<typeof useActivity>;
  currentUserId?: string;
  currency: string;
  hideGroup?: boolean;
  headingLevel?: 2 | 3;
  emptyText?: string;
}) {
  const { items, error, nextCursor, loadMore, loadingMore } = activity;
  if (error && !items) return <p role="alert" className="text-sm text-[var(--expense)]">{error}</p>;
  if (!items)
    return (
      <div aria-hidden="true" className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex animate-pulse gap-3">
            <div className="h-8 w-8 rounded-full bg-[var(--surface)]" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-3/4 rounded bg-[var(--surface)]" />
              <div className="h-2.5 w-1/3 rounded bg-[var(--surface)]" />
            </div>
          </div>
        ))}
      </div>
    );
  if (items.length === 0) return <p className="text-sm text-[var(--foreground-muted)]">{emptyText}</p>;
  return (
    <div className="space-y-4">
      <ActivityFeed items={items} currentUserId={currentUserId} currency={currency} hideGroup={hideGroup} headingLevel={headingLevel} />
      {error && <p role="alert" className="text-sm text-[var(--expense)]">{error}</p>}
      {nextCursor && (
        <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
          Load more
        </Button>
      )}
    </div>
  );
}
