"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/constants";
import { useSession } from "next-auth/react";
import { MemberSearch, type SelectedMember } from "@/components/ui/MemberSearch";

type Group = {
  id: string;
  name: string;
  description?: string;
  expenseCount?: number;
  _count?: { expenses: number };
  members?: { user: { id: string; name: string; email: string; profilePhoto?: string | null } }[];
  userBalance?: number;
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function GroupsPage() {
  const { data: session } = useSession();
  const currency = session?.user?.currency ?? "INR";
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    members: SelectedMember[];
  }>({ name: "", description: "", members: [] });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/groups");
    const data = await res.json();
    setGroups(data.groups ?? data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        members: form.members.map((m) => ({ id: m.id, email: m.email })),
      }),
    });
    if (res.ok) {
      setShowModal(false);
      setForm({ name: "", description: "", members: [] });
      load();
    }
    setCreating(false);
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold text-muted uppercase tracking-widest">Shared Splits</span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">Pockets</h1>
        </div>
        <Button onClick={() => setShowModal(true)}>Create Pocket</Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={
                <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              }
              title="No pockets yet"
              description="Create a pocket to start splitting expenses with friends and family."
              action={<Button onClick={() => setShowModal(true)}>Create Your First Pocket</Button>}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {groups.map((group) => {
            const balance = group.userBalance ?? 0;
            const balanceColor = balance > 0 ? "text-income font-semibold" : balance < 0 ? "text-expense font-semibold" : "text-muted";
            const balanceLabel = balance > 0
              ? `You are owed ${formatCurrency(balance, currency)}`
              : balance < 0
                ? `You owe ${formatCurrency(Math.abs(balance), currency)}`
                : "All settled up";

            return (
              <Link key={group.id} href={`/groups/${group.id}`} className="block h-full group">
                <Card className="hover:border-accent/40 dark:hover:border-accent/40 hover-lift cursor-pointer h-full transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]">
                  <CardHeader title={group.name} description={group.description ?? undefined} />
                  <CardBody className="mt-2 space-y-4">
                    <div className="flex items-center gap-1.5">
                      {(group.members ?? []).slice(0, 5).map((m) => {
                        const hasPhoto = !!m.user.profilePhoto;
                        return hasPhoto ? (
                          <img
                            key={m.user.id}
                            src={m.user.profilePhoto!}
                            alt={m.user.name}
                            title={m.user.name}
                            className="h-7 w-7 rounded-full object-cover border border-[#E8E8ED] dark:border-[#2C2C2E]"
                          />
                        ) : (
                          <div
                            key={m.user.id}
                            title={m.user.name}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent text-[10px] font-bold border border-accent/20 ring-1 ring-accent/15 select-none"
                          >
                            {initials(m.user.name)}
                          </div>
                        );
                      })}
                      {(group.members?.length ?? 0) > 5 && (
                        <span className="text-[10px] text-muted font-medium ml-1">+{(group.members?.length ?? 0) - 5}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 pt-2 border-t border-[#E8E8ED]/60 dark:border-[#2C2C2E]/40">
                      <p className="text-[10px] text-muted">
                        {group.members?.length ?? 0} members · {group.expenseCount ?? group._count?.expenses ?? 0} expenses
                      </p>
                      <p className={`text-xs ${balanceColor} tracking-tight`}>
                        {balanceLabel}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Pocket">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted">
              Pocket Members
            </label>
            <MemberSearch
              selectedMembers={form.members}
              onAddMember={(member) =>
                setForm({ ...form, members: [...form.members, member] })
              }
              onRemoveMember={(email) =>
                setForm({
                  ...form,
                  members: form.members.filter((m) => m.email !== email),
                })
              }
              excludeEmails={session?.user?.email ? [session.user.email] : []}
              placeholder="Search by name or type email..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
