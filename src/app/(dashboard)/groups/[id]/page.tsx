import { GroupPageClient, type GroupInitialData } from "@/components/groups/GroupPageClient";
import { getSession, requireGroupMember } from "@/lib/auth";
import { getGroupBalance, getGroupDetail, getGroupSettlements, listGroupExpenses } from "@/lib/group-data";

/**
 * A group's page. For active members the group, expenses, balances and payments are loaded on the
 * server so they're in the first paint; otherwise the page loads (and reports access) in the browser.
 */
export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const viewer = session?.user?.id
    ? { id: session.user.id, name: session.user.name ?? null, currency: session.user.currency ?? "INR" }
    : null;
  let initialData: GroupInitialData | null = null;

  const userId = session?.user?.id;
  if (userId && !("error" in (await requireGroupMember(id, userId)))) {
    try {
      const [group, expenses, balance, settle] = await Promise.all([
        getGroupDetail(id),
        listGroupExpenses(id, userId),
        getGroupBalance(id),
        getGroupSettlements(id),
      ]);
      if (group && balance) {
        // Dates become strings, exactly as the API sends them
        initialData = JSON.parse(JSON.stringify({ group, expenses, balance, settle }));
      }
    } catch {
      initialData = null;
    }
  }

  return <GroupPageClient initialData={initialData} viewer={viewer} />;
}
