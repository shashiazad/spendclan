"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { NETWORK_ERROR, readError } from "@/lib/api-errors";
import { ExpenseForm, type ExpensePayload, type FormMember } from "./ExpenseForm";

type Listener = (groupId: string) => void;

interface AddExpenseContextValue {
  /** Opens the add-expense dialog for a group, or with a group picker when no group is given. */
  openAddExpense: (groupId?: string) => void;
  /** Subscribes to successful adds (e.g. to refresh a group page). Returns an unsubscribe function. */
  onExpenseAdded: (listener: Listener) => () => void;
}

const AddExpenseContext = createContext<AddExpenseContextValue | null>(null);

export function useAddExpense() {
  const ctx = useContext(AddExpenseContext);
  if (!ctx) throw new Error("useAddExpense must be used inside AddExpenseProvider");
  return ctx;
}

type GroupOption = { id: string; name: string; memberCount: number };
type SelectedGroup = { id: string; name: string; members: FormMember[] };

/** One add-expense dialog shared by the floating + button and the group page. */
export function AddExpenseProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const currency = session?.user?.currency ?? "INR";
  const userId = session?.user?.id;

  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  // Opened without a group: the user picks one and may change it
  const [canChangeGroup, setCanChangeGroup] = useState(false);
  const [groups, setGroups] = useState<GroupOption[] | null>(null);
  const [group, setGroup] = useState<SelectedGroup | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const listeners = useRef(new Set<Listener>());

  const openAddExpense = useCallback((id?: string) => {
    setError(null);
    setLoadError(null);
    setGroup(null);
    setGroups(null);
    setGroupId(id ?? null);
    setCanChangeGroup(!id);
    setOpen(true);
  }, []);

  const onExpenseAdded = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  // Group picker: load the user's groups
  useEffect(() => {
    if (!open || groupId) return;
    let active = true;
    fetch("/api/groups")
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res, "Couldn't load your groups."));
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setGroups(
          (data.groups ?? []).map((g: { id: string; name: string; members?: unknown[] }) => ({
            id: g.id,
            name: g.name,
            memberCount: g.members?.length ?? 0,
          })),
        );
      })
      .catch((e) => active && setLoadError(e instanceof Error ? e.message : NETWORK_ERROR));
    return () => {
      active = false;
    };
  }, [open, groupId]);

  // Chosen group: load its active members for the split editor
  useEffect(() => {
    if (!open || !groupId) return;
    let active = true;
    fetch(`/api/groups/${groupId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res, "Couldn't load this group."));
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        const g = data.group as { id: string; name: string; members: { userId: string; user: { id: string; name: string } }[] };
        setGroup({ id: g.id, name: g.name, members: g.members.map((m) => ({ id: m.userId, name: m.user.name })) });
      })
      .catch((e) => active && setLoadError(e instanceof Error ? e.message : NETWORK_ERROR));
    return () => {
      active = false;
    };
  }, [open, groupId]);

  async function submit(payload: ExpensePayload): Promise<boolean> {
    // Ignore repeat submits (double tap, Enter + click) while one is in flight
    if (!group || inFlight.current) return false;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${group.id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        // The dialog stays open with everything the user typed
        setError(await readError(res, "Couldn't add the expense."));
        return false;
      }
      addToast(`Expense added to ${group.name}`);
      listeners.current.forEach((listener) => listener(group.id));
      setOpen(false);
      return true;
    } catch {
      setError(NETWORK_ERROR);
      return false;
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  function chooseAnotherGroup() {
    setLoadError(null);
    setGroup(null);
    setGroupId(null);
    setCanChangeGroup(true);
  }

  const value = useMemo(() => ({ openAddExpense, onExpenseAdded }), [openAddExpense, onExpenseAdded]);

  let body: ReactNode;
  if (loadError) {
    body = (
      <div className="space-y-4 text-sm">
        <p role="alert" className="text-[var(--expense)]">{loadError}</p>
        <Button variant="secondary" onClick={chooseAnotherGroup}>Choose a group</Button>
      </div>
    );
  } else if (!groupId) {
    body = !groups ? (
      <div className="flex justify-center py-10"><LoadingSpinner /></div>
    ) : groups.length === 0 ? (
      <div className="space-y-4 py-4 text-center text-sm text-[var(--foreground-muted)]">
        <p>You aren&apos;t in any groups yet. Create one to start splitting expenses.</p>
        <Link
          href="/groups"
          onClick={() => setOpen(false)}
          className="inline-flex min-h-[44px] items-center rounded-xl bg-[var(--accent)] px-4 text-sm font-medium text-white"
        >
          Go to groups
        </Link>
      </div>
    ) : (
      <div className="space-y-3">
        <p className="text-sm text-[var(--foreground-muted)]">Which group is this expense for?</p>
        <ul className="space-y-2">
          {groups.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => setGroupId(g.id)}
                className="flex w-full min-h-[52px] items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
              >
                <span className="truncate text-sm font-medium text-[var(--foreground)]">{g.name}</span>
                <span className="shrink-0 text-xs text-[var(--foreground-muted)]">
                  {g.memberCount} {g.memberCount === 1 ? "member" : "members"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  } else if (!group) {
    body = <div className="flex justify-center py-10"><LoadingSpinner /></div>;
  } else {
    body = (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sidebar-hover)] px-3 py-2 text-sm">
          <span className="truncate text-[var(--foreground-muted)]">
            In <strong className="font-semibold text-[var(--foreground)]">{group.name}</strong>
          </span>
          {canChangeGroup && (
            <button type="button" onClick={chooseAnotherGroup} className="min-h-[36px] shrink-0 text-xs font-semibold text-[var(--accent)]">
              Change group
            </button>
          )}
        </div>
        <ExpenseForm
          key={group.id}
          members={group.members}
          currentUserId={userId}
          currency={currency}
          submitLabel="Add Expense"
          pending={pending}
          error={error}
          onSubmit={submit}
          onCancel={() => setOpen(false)}
          autoFocus
        />
      </div>
    );
  }

  return (
    <AddExpenseContext.Provider value={value}>
      {children}
      <Modal open={open} onClose={() => setOpen(false)} title="Add expense" size="lg">
        {body}
      </Modal>
    </AddExpenseContext.Provider>
  );
}
