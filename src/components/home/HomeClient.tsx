"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { useSession } from "next-auth/react";
import { ActivityPanel, useActivity } from "@/components/activity/ActivityFeed";
import { AllGroupsReport } from "@/components/groups/AllGroupsReport";
import { useAddExpense } from "@/components/groups/AddExpenseProvider";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { BentoGrid, BentoTile } from "@/components/ui/Bento";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MemberSearch, type SelectedMember } from "@/components/ui/MemberSearch";
import { Modal } from "@/components/ui/Modal";
import { NETWORK_ERROR, readError } from "@/lib/api-errors";
import { formatCurrency } from "@/lib/constants";
import type { HomeData } from "@/lib/home-data";
import type { Viewer } from "@/components/groups/GroupPageClient";
import { PageHeader } from "@/components/ui/PageHeader";

/** "You owe ₹400.00" / "You are owed ₹650.00" / "All settled up", with a sign for colour-blind readers. */
function balanceText(balance: number, currency: string) {
  if (balance > 0.004) return { text: `You are owed ${formatCurrency(balance, currency)}`, tone: "text-[var(--owed)]", sign: "+" };
  if (balance < -0.004) return { text: `You owe ${formatCurrency(-balance, currency)}`, tone: "text-[var(--owe)]", sign: "−" };
  return { text: "All settled up", tone: "text-[var(--foreground-muted)]", sign: "✓" };
}

function BalanceChip({ balance, currency }: { balance: number; currency: string }) {
  const b = balanceText(balance, currency);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold money ${b.tone}`}>
      <span aria-hidden="true">{b.sign}</span>
      {b.text}
    </span>
  );
}

function QuickAction({ label, onClick, href, icon }: { label: string; onClick?: () => void; href?: string; icon: ReactNode }) {
  const className =
    "glass flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl px-2 text-xs font-medium text-[var(--foreground)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]";
  const inner = (
    <>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-dim)] text-[var(--accent)]" aria-hidden="true">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {icon}
        </svg>
      </span>
      {label}
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

const GROUPS_SHOWN = 6;

/** Home (`/groups`). `initialHome` is loaded on the server so balances are in the first paint. */
export function HomeClient({ initialHome, viewer }: { initialHome: HomeData | null; viewer: Viewer | null }) {
  const { data: session } = useSession();
  const currency = session?.user?.currency ?? viewer?.currency ?? "INR";
  const userId = session?.user?.id ?? viewer?.id;
  const firstName = (session?.user?.name ?? viewer?.name)?.split(" ")[0];
  const { openAddExpense, onExpenseAdded } = useAddExpense();

  const [home, setHome] = useState<HomeData | null>(initialHome);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const activity = useActivity({ limit: 8, refreshKey: version });

  // Create group
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{ name: string; description: string; members: SelectedMember[] }>({ name: "", description: "", members: [] });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/home");
      if (!res.ok) throw new Error(await readError(res, "Couldn't load your groups."));
      setHome(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : NETWORK_ERROR);
    }
  }, []);

  // The server already sent the first version; reload after changes (and if it couldn't)
  useEffect(() => {
    if (version === 0 && initialHome) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) load();
    });
    return () => {
      active = false;
    };
  }, [load, version, initialHome]);

  // Refresh after an expense is added from the floating + button
  useEffect(() => onExpenseAdded(() => setVersion((v) => v + 1)), [onExpenseAdded]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          members: form.members.map((m) => ({ id: m.id, email: m.email })),
        }),
      });
      if (!res.ok) {
        setCreateError(await readError(res, "Couldn't create the group."));
        return;
      }
      setShowModal(false);
      setForm({ name: "", description: "", members: [] });
      setVersion((v) => v + 1);
    } catch {
      setCreateError(NETWORK_ERROR);
    } finally {
      setCreating(false);
    }
  }

  function openCreate() {
    setCreateError(null);
    setShowModal(true);
  }

  if (error && !home) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-16 text-center">
        <p role="alert" className="text-sm text-[var(--expense)]">{error}</p>
        <Button variant="secondary" onClick={() => setVersion((v) => v + 1)}>Try again</Button>
      </div>
    );
  }

  const groups = home?.groups ?? [];
  const totals = home?.totals ?? { owedToYou: 0, youOwe: 0, net: 0 };
  const people = home?.people ?? [];
  const hasGroups = groups.length > 0;
  const owedShare = totals.owedToYou + totals.youOwe > 0 ? (totals.owedToYou / (totals.owedToYou + totals.youOwe)) * 100 : 50;
  const net = balanceText(totals.net, currency);
  const maxSpend = Math.max(...groups.map((g) => g.spendThisMonth), 0);
  const recentGroup = groups[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Groups"
        eyebrow={firstName ? `Hi, ${firstName}` : "Welcome back"}
        actions={
          <>
            {hasGroups && <AllGroupsReport />}
            <Button onClick={openCreate}>Create Group</Button>
          </>
        }
      />

      {!home ? (
        <BentoGrid>
          {[2, 1, 1, 2, 1, 1].map((span, i) => (
            <div key={i} aria-hidden="true" className={`card h-40 animate-pulse ${span === 2 ? "md:col-span-2" : ""}`} />
          ))}
        </BentoGrid>
      ) : (
        <BentoGrid>
          {/* Net balance (hero) */}
          <BentoTile title="Net balance" span={2} rows={2} tone="hero">
            {hasGroups ? (
              <div className="flex flex-1 flex-col gap-5">
                <p className={`flex items-baseline gap-2 text-3xl font-bold tracking-tight money sm:text-4xl lg:text-5xl ${net.tone}`}>
                  <span aria-hidden="true" className="text-2xl sm:text-3xl">{net.sign}</span>
                  {totals.net === 0 && totals.owedToYou === 0 ? "You're all settled up" : net.text}
                </p>

                <div>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--surface)]" aria-hidden="true">
                    <div className="h-full bg-[var(--owed)]" style={{ width: `${owedShare}%` }} />
                    <div className="h-full bg-[var(--owe)]" style={{ width: `${100 - owedShare}%` }} />
                  </div>
                  <p className="mt-2 flex flex-wrap justify-between gap-2 text-sm money">
                    <span className="text-[var(--owed)]">+ Owed to you {formatCurrency(totals.owedToYou, currency)}</span>
                    <span className="text-[var(--owe)]">− You owe {formatCurrency(totals.youOwe, currency)}</span>
                  </p>
                </div>

                {people.length > 0 && (
                  <ul className="space-y-2" aria-label="People to settle with">
                    {people.slice(0, 3).map((p) => (
                      <li key={p.id} className="flex items-center gap-3">
                        <Avatar person={p} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)]">{p.name}</span>
                        <span className={`text-sm font-semibold money ${p.net > 0 ? "text-[var(--owed)]" : "text-[var(--owe)]"}`}>
                          {p.net > 0 ? `owes you ${formatCurrency(p.net, currency)}` : `you owe ${formatCurrency(-p.net, currency)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto flex flex-wrap gap-2">
                  <Link
                    href="/balances"
                    className="inline-flex min-h-[44px] items-center rounded-xl bg-accent-gradient px-4 text-sm font-medium text-white shadow-[0_6px_16px_-6px_var(--accent-ring)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                  >
                    Settle up
                  </Link>
                  <Button variant="secondary" onClick={() => openAddExpense()}>Add expense</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-start justify-center gap-4">
                <p className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Split costs with the people you share them with</p>
                <p className="text-sm text-[var(--foreground-muted)]">Create a group for your flat, a trip or a team, add expenses, and SpendClan works out who owes whom.</p>
                <Button size="lg" onClick={openCreate}>Create your first group</Button>
              </div>
            )}
          </BentoTile>

          {/* Quick actions */}
          <BentoTile title="Quick actions">
            <div className="grid grid-cols-2 gap-2">
              <QuickAction label="Add expense" onClick={() => openAddExpense()} icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />} />
              <QuickAction
                label="Settle up"
                href="/balances"
                icon={<path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />}
              />
              <QuickAction
                label="Create group"
                onClick={openCreate}
                icon={<path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198v.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197M6 18.719a5.971 5.971 0 01.941-3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0z" />}
              />
              <QuickAction
                label="Invite"
                href={recentGroup ? `/groups/${recentGroup.id}?invite=1` : undefined}
                onClick={recentGroup ? undefined : openCreate}
                icon={<path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />}
              />
            </div>
          </BentoTile>

          {/* Active groups */}
          <BentoTile
            title="Your groups"
            rows={2}
            action={
              <button type="button" onClick={openCreate} className="min-h-[32px] text-xs font-semibold text-[var(--accent)] hover:underline">
                + New
              </button>
            }
          >
            {hasGroups ? (
              <>
                <ul className="-mx-2 space-y-1">
                  {(showAllGroups ? groups : groups.slice(0, GROUPS_SHOWN)).map((g) => (
                    <li key={g.id}>
                      <Link
                        href={`/groups/${g.id}`}
                        className="flex min-h-[56px] items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[var(--sidebar-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--foreground)]" title={g.name}>{g.name}</p>
                          <BalanceChip balance={g.myBalance} currency={currency} />
                          {g.lastActivityAt && (
                            <p className="text-xs text-[var(--foreground-subtle)]">
                              Active {formatDistanceToNowStrict(new Date(g.lastActivityAt), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                        <AvatarStack people={g.members} max={3} />
                      </Link>
                    </li>
                  ))}
                </ul>
                {groups.length > GROUPS_SHOWN && (
                  <button
                    type="button"
                    onClick={() => setShowAllGroups((v) => !v)}
                    className="mt-2 min-h-[36px] text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    {showAllGroups ? "Show fewer" : `Show all ${groups.length} groups`}
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--foreground-muted)]">No groups yet.</p>
            )}
          </BentoTile>

          {/* People */}
          <BentoTile title="Who owes whom" action={people.length > 0 && <Link href="/balances" className="text-xs font-semibold text-[var(--accent)] hover:underline">All balances</Link>}>
            {people.length === 0 ? (
              <p className="text-sm text-[var(--foreground-muted)]">{hasGroups ? "Nobody owes anybody. 🎉" : "Balances appear once you add expenses."}</p>
            ) : (
              <ul className="space-y-3">
                {people.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <Avatar person={p} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">{p.name}</p>
                      <p className={`text-xs money ${p.net > 0 ? "text-[var(--owed)]" : "text-[var(--owe)]"}`}>
                        {p.net > 0 ? `+ owes you ${formatCurrency(p.net, currency)}` : `− you owe ${formatCurrency(-p.net, currency)}`}
                      </p>
                    </div>
                    {p.net < 0 && (
                      <Link
                        href={`/groups/${p.groups.find((g) => g.amount < 0)?.id ?? p.groups[0].id}?settle=${p.id}`}
                        className="glass inline-flex min-h-[36px] items-center rounded-full px-3 text-xs font-semibold text-[var(--accent)]"
                        aria-label={`Pay ${p.name}`}
                      >
                        Pay
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </BentoTile>

          {/* Recent activity */}
          <BentoTile
            title="Recent activity"
            span={2}
            rows={2}
            action={<Link href="/activity" className="text-xs font-semibold text-[var(--accent)] hover:underline">View all</Link>}
          >
            <ActivityPanel activity={{ ...activity, nextCursor: null }} currentUserId={userId} currency={currency} />
          </BentoTile>

          {/* Spending by group, this month */}
          <BentoTile title="This month by group">
            {maxSpend === 0 ? (
              <p className="text-sm text-[var(--foreground-muted)]">No spending recorded this month yet.</p>
            ) : (
              <>
                <p className="mb-3 text-2xl font-bold text-[var(--foreground)] money">{formatCurrency(home.spendThisMonth, currency)}</p>
                <ul className="space-y-3">
                  {groups
                    .filter((g) => g.spendThisMonth > 0)
                    .sort((a, b) => b.spendThisMonth - a.spendThisMonth)
                    .slice(0, 5)
                    .map((g) => (
                      <li key={g.id}>
                        <div className="flex justify-between gap-2 text-xs">
                          <span className="truncate text-[var(--foreground)]">{g.name}</span>
                          <span className="money text-[var(--foreground-muted)]">{formatCurrency(g.spendThisMonth, currency)}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]" aria-hidden="true">
                          <div className="h-full rounded-full bg-accent-gradient" style={{ width: `${(g.spendThisMonth / maxSpend) * 100}%` }} />
                        </div>
                      </li>
                    ))}
                </ul>
              </>
            )}
          </BentoTile>
        </BentoGrid>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Group">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Name" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Description" maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="space-y-1.5">
            <p className="block text-xs font-medium text-[var(--foreground-muted)]">Group members</p>
            <MemberSearch
              selectedMembers={form.members}
              onAddMember={(member) => setForm({ ...form, members: [...form.members, member] })}
              onRemoveMember={(email) => setForm({ ...form, members: form.members.filter((m) => m.email !== email) })}
              excludeEmails={session?.user?.email ? [session.user.email] : []}
              placeholder="Search by name or type email..."
            />
          </div>
          {createError && <p role="alert" className="text-sm text-[var(--expense)]">{createError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={creating} disabled={!form.name.trim()}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
