"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { differenceInDays, format } from "date-fns";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive?: string;
  createdAt: string;
  stats: { expenses: number; income: number; groups: number };
};

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.status === 403) {
      router.push("/dashboard");
      return;
    }
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (session && session.user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    if (session) load();
  }, [session, load, router]);

  async function handleDelete(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setConfirmDelete(null);
    load();
  }

  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin</h1>
        <p className="mt-1 text-slate-400">User management</p>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-400">
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Last Active</th>
                <th className="px-6 py-3">Stats</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const inactive = user.lastActive
                  ? differenceInDays(new Date(), new Date(user.lastActive)) > 30
                  : differenceInDays(new Date(), new Date(user.createdAt)) > 30;
                const isAdmin = user.role === "ADMIN";
                const isSelf = user.id === session.user.id;

                return (
                  <tr
                    key={user.id}
                    className={`border-b border-slate-800/50 ${inactive ? "bg-amber-500/5" : ""}`}
                  >
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-200">{user.name}</p>
                      <p className="text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={isAdmin ? "warning" : "default"}>{user.role}</Badge>
                    </td>
                    <td className="px-6 py-3">
                      {user.lastActive ? (
                        <span className={inactive ? "text-amber-400" : "text-slate-400"}>
                          {format(new Date(user.lastActive), "MMM d, yyyy")}
                          {inactive && " (inactive)"}
                        </span>
                      ) : (
                        <span className="text-slate-500">Never</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-400">
                      {user.stats.expenses} exp · {user.stats.income} inc · {user.stats.groups} grp
                    </td>
                    <td className="px-6 py-3">
                      {!isAdmin && !isSelf && (
                        <Button
                          size="sm"
                          variant={confirmDelete === user.id ? "danger" : "ghost"}
                          onClick={() => handleDelete(user.id)}
                        >
                          {confirmDelete === user.id ? "Confirm Delete" : "Delete"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
