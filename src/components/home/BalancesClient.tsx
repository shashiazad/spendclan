"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";
import { BentoGrid, BentoTile } from "@/components/ui/Bento";
import { Button } from "@/components/ui/Button";
import { NETWORK_ERROR, readError } from "@/lib/api-errors";
import { formatCurrency } from "@/lib/constants";
import type { HomeData } from "@/lib/home-data";
import type { Viewer } from "@/components/groups/GroupPageClient";
import { PageHeader } from "@/components/ui/PageHeader";

/** Everyone you share costs with, netted across groups, with where each amount comes from. */
/** Balances (`/balances`). `initialHome` is loaded on the server so the numbers are in the first paint. */
export function BalancesClient({ initialHome, viewer }: { initialHome: HomeData | null; viewer: Viewer | null }) {
  const { data: session } = useSession();
  const currency = session?.user?.currency ?? viewer?.currency ?? "INR";
  const [home, setHome] = useState<HomeData | null>(initialHome);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const fmt = (n: number) => formatCurrency(n, currency);

  useEffect(() => {
    if (version === 0 && initialHome) return;
    let active = true;
    fetch("/api/home")
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res, "Couldn't load balances."));
        return res.json();
      })
      .then((data) => {
        if (active) {
          setHome(data);
          setError(null);
        }
      })
      .catch((e) => active && setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : NETWORK_ERROR));
    return () => {
      active = false;
    };
  }, [version, initialHome]);

  const owe = home?.people.filter((p) => p.net < 0) ?? [];
  const owed = home?.people.filter((p) => p.net > 0) ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Balances" eyebrow="Across all your groups" />

      {error && !home ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-[var(--expense)]">{error}</p>
          <Button variant="secondary" onClick={() => setVersion((v) => v + 1)}>Try again</Button>
        </div>
      ) : !home ? (
        <BentoGrid>
          {[0, 1, 2].map((i) => <div key={i} aria-hidden="true" className="card h-40 animate-pulse" />)}
        </BentoGrid>
      ) : (
        <BentoGrid>
          <BentoTile title="Summary" span={3} lgSpan={4} tone="hero">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-[var(--foreground-muted)]">Owed to you</dt>
                <dd className="text-2xl font-bold text-[var(--owed)] money sm:text-3xl">+ {fmt(home.totals.owedToYou)}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--foreground-muted)]">You owe</dt>
                <dd className="text-2xl font-bold text-[var(--owe)] money sm:text-3xl">− {fmt(home.totals.youOwe)}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--foreground-muted)]">Net</dt>
                <dd className="text-2xl font-bold text-[var(--foreground)] money sm:text-3xl">
                  {home.totals.net > 0 ? "+ " : home.totals.net < 0 ? "− " : ""}
                  {fmt(Math.abs(home.totals.net))}
                </dd>
              </div>
            </dl>
          </BentoTile>

          {[
            { title: "You owe", list: owe, empty: "You don't owe anyone. 🎉" },
            { title: "Owes you", list: owed, empty: "Nobody owes you right now." },
          ].map(({ title, list, empty }) => (
            <BentoTile key={title} title={title} span={3} lgSpan={2}>
              {list.length === 0 ? (
                <p className="text-sm text-[var(--foreground-muted)]">{empty}</p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {list.map((p) => (
                    <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <Avatar person={p} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{p.name}</p>
                          <p className={`text-sm money ${p.net > 0 ? "text-[var(--owed)]" : "text-[var(--owe)]"}`}>
                            {p.net > 0 ? `+ owes you ${fmt(p.net)}` : `− you owe ${fmt(-p.net)}`}
                          </p>
                        </div>
                      </div>
                      <ul className="mt-2 space-y-1.5 pl-12" aria-label={`Balances with ${p.name} by group`}>
                        {p.groups.map((g) => (
                          <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <Link href={`/groups/${g.id}`} className="font-medium text-[var(--accent)] hover:underline">{g.name}</Link>
                            <span className="flex items-center gap-2">
                              <span className="money text-[var(--foreground-muted)]">{fmt(Math.abs(g.amount))}</span>
                              {g.amount < 0 && (
                                <Link
                                  href={`/groups/${g.id}?settle=${p.id}`}
                                  className="glass inline-flex min-h-[32px] items-center rounded-full px-3 font-semibold text-[var(--accent)]"
                                  aria-label={`Pay ${p.name} ${fmt(-g.amount)} in ${g.name}`}
                                >
                                  Pay
                                </Link>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </BentoTile>
          ))}
        </BentoGrid>
      )}
    </div>
  );
}
