import { BalancesClient } from "@/components/home/BalancesClient";
import { getSession } from "@/lib/auth";
import { getHomeData, type HomeData } from "@/lib/home-data";

/** Balances: loaded on the server so the numbers are in the first paint. */
export default async function BalancesPage() {
  const session = await getSession();
  const viewer = session?.user?.id
    ? { id: session.user.id, name: session.user.name ?? null, currency: session.user.currency ?? "INR" }
    : null;
  let initialHome: HomeData | null = null;
  if (session?.user?.id) {
    initialHome = await getHomeData(session.user.id).catch(() => null);
  }
  return <BalancesClient initialHome={initialHome} viewer={viewer} />;
}
