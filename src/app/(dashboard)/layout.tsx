import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "@/components/dashboard/Footer";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { QuickAddFAB } from "@/components/dashboard/QuickAddFAB";
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
      <div className="bg-background min-h-screen text-foreground transition-colors duration-300">
        <Sidebar />
        <div className="flex min-h-screen flex-col lg:pr-64">
          <main className="flex-1 px-4 pb-28 pt-20 lg:px-8 lg:py-8">
            {children}
          </main>
          <Footer />
        </div>
        <QuickAddFAB />
      </div>
    </ToastProvider>
  );
}
