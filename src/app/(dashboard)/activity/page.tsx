"use client";

import { useSession } from "next-auth/react";
import { ActivityPanel, useActivity } from "@/components/activity/ActivityFeed";

/** Everything that happened in your groups, newest first. */
export default function ActivityPage() {
  const { data: session } = useSession();
  const activity = useActivity({ limit: 30 });
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <p className="text-sm text-[var(--foreground-muted)]">Across all your groups</p>
        <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-[var(--foreground)]">Activity</h1>
      </div>
      <div className="card p-4 sm:p-6">
        <ActivityPanel activity={activity} currentUserId={session?.user?.id} currency={session?.user?.currency ?? "INR"} />
      </div>
    </div>
  );
}
