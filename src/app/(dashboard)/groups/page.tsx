import { HomeClient } from "@/components/home/HomeClient";
import { getSession } from "@/lib/auth";
import { getHomeData, type HomeData } from "@/lib/home-data";

/** Home: balances and groups are loaded on the server so they're in the first paint. */
export default async function GroupsHomePage() {
  const session = await getSession();
  const viewer = session?.user?.id
    ? { id: session.user.id, name: session.user.name ?? null, currency: session.user.currency ?? "INR" }
    : null;
  let initialHome: HomeData | null = null;
  if (session?.user?.id) {
    // If this fails the page still renders and loads the data in the browser
    initialHome = await getHomeData(session.user.id).catch(() => null);
  }
  return <HomeClient initialHome={initialHome} viewer={viewer} />;
}
