"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { NETWORK_ERROR, readError } from "@/lib/api-errors";
import { readUrlFilters, toApiQuery, writeUrlFilters, type UrlFilters } from "@/lib/search-url";

/** Filters stored in the page URL. Updates replace the history entry, so typing doesn't flood Back. */
export function useUrlFilters(): [UrlFilters, (next: UrlFilters) => void] {
  const params = useSearchParams();
  const key = params.toString();
  const filters = useMemo(() => readUrlFilters(new URLSearchParams(key)), [key]);
  const setFilters = useCallback((next: UrlFilters) => {
    const qs = writeUrlFilters(next, new URLSearchParams(window.location.search)).toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, []);
  return [filters, setFilters];
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export interface SearchItem {
  id: string;
  amount: number;
  description: string;
  date: string;
  splitType: string;
  createdAt: string;
  deletedAt: string | null;
  edited: boolean;
  canEdit: boolean;
  paidBy: { id: string; name: string };
  splits: { amount: number; user: { id: string; name: string } }[];
  group: { id: string; name: string };
}

interface Loaded {
  /** The request these results belong to; while it differs from the current one we are loading. */
  key: string;
  items: SearchItem[];
  totalCount: number;
  totalAmountMinor: number;
  nextCursor: string | null;
  error: string | null;
}

/**
 * Loads the first page whenever the filters change (cancelling the previous request) and appends
 * further pages on `loadMore`. `reload` re-runs the current search, e.g. after an edit.
 */
export function useExpenseSearch(endpoint: string, filters: UrlFilters, enabled = true) {
  const query = toApiQuery(filters).toString();
  const [version, setVersion] = useState(0);
  const key = `${endpoint}?${query}#${version}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const moreController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    moreController.current?.abort();
    fetch(`${endpoint}?${query}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res, "Couldn't search expenses."));
        return res.json();
      })
      .then((data) => {
        setLoaded({ key, items: data.items, totalCount: data.totalCount, totalAmountMinor: data.totalAmountMinor, nextCursor: data.nextCursor, error: null });
        setMoreError(null);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        const error = e instanceof Error && e.message !== "Failed to fetch" ? e.message : NETWORK_ERROR;
        setLoaded((prev) => ({ ...(prev ?? { items: [], totalCount: 0, totalAmountMinor: 0, nextCursor: null }), key, error }));
      });
    return () => controller.abort();
  }, [endpoint, query, enabled, key]);

  const loading = enabled && loaded?.key !== key;
  const nextCursor = loaded?.nextCursor ?? null;

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore || loading) return;
    const controller = new AbortController();
    moreController.current = controller;
    setLoadingMore(true);
    setMoreError(null);
    const params = toApiQuery(filters, { cursor: nextCursor });
    fetch(`${endpoint}?${params}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res, "Couldn't load more expenses."));
        return res.json();
      })
      .then((data) =>
        setLoaded((prev) =>
          prev && {
            ...prev,
            items: [...prev.items, ...data.items.filter((i: SearchItem) => !prev.items.some((x) => x.id === i.id))],
            nextCursor: data.nextCursor,
          },
        ),
      )
      .catch((e) => {
        if (!controller.signal.aborted) setMoreError(e instanceof Error ? e.message : NETWORK_ERROR);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingMore(false);
      });
  }, [endpoint, filters, nextCursor, loadingMore, loading]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return {
    items: loaded?.items ?? [],
    totalCount: loaded?.totalCount ?? 0,
    totalAmountMinor: loaded?.totalAmountMinor ?? 0,
    nextCursor,
    loading,
    loadingMore,
    error: loading ? null : (loaded?.error ?? moreError),
    loadMore,
    reload,
  };
}

export type ExpenseSearchResult = ReturnType<typeof useExpenseSearch>;
