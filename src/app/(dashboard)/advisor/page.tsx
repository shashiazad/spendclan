"use client";

import { Tabs } from "@/components/ui/Tabs";
import { AIInsightsCard } from "@/components/dashboard/AIInsightsCard";
import { AIChat } from "@/components/dashboard/AIChat";
import { ExpenseReport } from "@/components/dashboard/ExpenseReport";
import { PageHeader } from "@/components/ui/PageHeader";

const tabs = [
  {
    id: "insights",
    label: "Insights",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
      </svg>
    ),
  },
  {
    id: "reports",
    label: "Reports",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    id: "chat",
    label: "Chat Advisor",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
  },
];

export default function AdvisorPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="AI Group Advisor" eyebrow="Powered by your group data" description="Insights, reports and answers about your groups, balances and settle-ups" />

      <Tabs tabs={tabs} defaultTab="insights">
        {(activeTab) => (
          <>
            {activeTab === "insights" && (
              <div className="space-y-6">
                <AIInsightsCard />
              </div>
            )}
            {activeTab === "reports" && (
              <div className="animate-slide-up">
                <ExpenseReport />
              </div>
            )}
            {activeTab === "chat" && (
              <div className="animate-slide-up">
                <AIChat />
              </div>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}
