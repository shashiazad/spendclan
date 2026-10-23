import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "@/components/dashboard/Footer";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { QuickAddFAB } from "@/components/dashboard/QuickAddFAB";
import { AddExpenseProvider } from "@/components/groups/AddExpenseProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <ToastProvider>
      <AddExpenseProvider>
      <div className="relative min-h-dvh bg-background text-foreground">
        <div className="ambient-mesh" aria-hidden="true" />
        <Sidebar />
        <div className="flex min-h-dvh flex-col md:pl-20 lg:pl-64">
          {/* Phones: room for the top bar and the floating bottom bar; wide screens get side space, not stretched tiles */}
          <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))] md:px-6 md:pb-10 md:pt-8 lg:px-8">
            {children}
          </main>
          <Footer />
        </div>
        <QuickAddFAB />
      </div>
      </AddExpenseProvider>
    </ToastProvider>
  );
}
