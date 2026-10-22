"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { readError } from "@/lib/api-errors";

const DATASETS = [
  { id: "expenses", label: "Personal expenses" },
  { id: "income", label: "Income" },
  { id: "savings", label: "Monthly savings" },
  { id: "savings-goals", label: "Savings goals" },
  { id: "recurring", label: "Recurring expenses" },
] as const;

type Counts = Record<(typeof DATASETS)[number]["id"], number>;

const baseLink =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]";
const primaryLink = `${baseLink} w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] sm:w-auto`;
const linkClass = `${baseLink} border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]`;

/** Download of the retired personal-finance records (expenses, income, savings, recurring). */
export function PersonalDataExport() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/users/me/export")
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res, "Couldn't check your personal data."));
        return res.json();
      })
      .then((data) => active && setCounts(data.counts))
      .catch((e) => active && setError(e instanceof Error ? e.message : "Couldn't check your personal data."));
    return () => {
      active = false;
    };
  }, []);

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <Card>
      <CardHeader
        title="Your personal finance data"
        description="SpendClan now focuses on group expenses. Personal expenses, income, savings and recurring entries you added earlier are kept safe and can be downloaded here."
      />
      <CardBody>
        {error ? (
          <p role="alert" className="text-sm text-[var(--expense)]">{error}</p>
        ) : !counts ? (
          <div className="flex justify-center py-4"><LoadingSpinner /></div>
        ) : total === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)]">You don&apos;t have any personal finance records.</p>
        ) : (
          <div className="space-y-4">
            <a href="/api/users/me/export?format=json" download className={primaryLink}>
              Download everything (JSON)
            </a>
            <ul className="space-y-2" aria-label="Download as CSV">
              {DATASETS.filter((d) => counts[d.id] > 0).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[var(--foreground-muted)]">
                    {d.label} <span className="tabular-nums">({counts[d.id]})</span>
                  </span>
                  <a href={`/api/users/me/export?format=csv&dataset=${d.id}`} download className={linkClass} aria-label={`Download ${d.label} as CSV`}>
                    CSV
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
