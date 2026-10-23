"use client";

import { useSession } from "next-auth/react";
import { ActivityPanel, useActivity } from "@/components/activity/ActivityFeed";
import { PageHeader } from "@/components/ui/PageHeader";

/** Everything that happened in your groups, newest first. */
export default function ActivityPage() {
  const { data: session } = useSession();
  const activity = useActivity({ limit: 30 });
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Activity" eyebrow="Across all your groups" />
      <div className="card p-4 sm:p-6">
        <ActivityPanel activity={activity} currentUserId={session?.user?.id} currency={session?.user?.currency ?? "INR"} headingLevel={2} />
      </div>
    </div>
  );
}
