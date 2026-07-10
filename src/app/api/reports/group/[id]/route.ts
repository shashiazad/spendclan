import { NextResponse } from "next/server";
import { requireAuth, requireGroupMember } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeMemberBalances, simplifyDebts } from "@/lib/group-balances";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: groupId } = await context.params;

  // Check if current user is indeed a member of this group
  const memberCheck = await requireGroupMember(groupId, auth.session.user.id);
  if ("error" in memberCheck) return memberCheck.error;

  const { searchParams } = new URL(request.url);
  const monthStr = searchParams.get("month");
  const yearStr = searchParams.get("year");

  let dateFilter: { gte: Date; lt: Date } | undefined = undefined;
  let monthLabel = "All Time";
  if (monthStr && yearStr) {
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    if (!isNaN(month) && month >= 1 && month <= 12 && !isNaN(year)) {
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      dateFilter = {
        gte: startDate,
        lt: endDate,
      };
      monthLabel = new Date(year, month - 1).toLocaleString("default", { month: "long" }) + " " + year;
    }
  }

  try {
    // 1. Fetch group metadata and members list
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // 2. Fetch expenses and settlements for calculations
    // Note: Net outstanding balances are always calculated using all historical data to ensure correct debt states,
    // but the reporting summaries/lists will be filtered by the date range if selected.
    const allExpenses = await prisma.groupExpense.findMany({
      where: { groupId },
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { date: "asc" },
    });

    const allSettlements = await prisma.settlement.findMany({
      where: { groupId },
      include: {
        from: { select: { id: true, name: true } },
        to: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Compute Net Outstanding Balances & Debts using ALL historical records
    const membersInput = group.members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
    }));
    const expensesInput = allExpenses.map((e) => ({
      amount: e.amount,
      paidById: e.paidById,
      splits: e.splits.map((s) => ({ userId: s.userId, amount: s.amount })),
    }));
    const settlementsInput = allSettlements.map((s) => ({
      amount: s.amount,
      fromId: s.fromId,
      toId: s.toId,
    }));

    const allTimeBalances = computeMemberBalances(membersInput, expensesInput, settlementsInput);
    const allTimeDebts = simplifyDebts(allTimeBalances);

    // Apply date filtering to lists/aggregations for the selected month (if filter active)
    const reportExpenses = dateFilter
      ? allExpenses.filter((e) => new Date(e.date) >= dateFilter.gte && new Date(e.date) < dateFilter.lt)
      : allExpenses;

    const reportSettlements = dateFilter
      ? allSettlements.filter((s) => new Date(s.createdAt) >= dateFilter.gte && new Date(s.createdAt) < dateFilter.lt)
      : allSettlements;

    // Selected Month Summaries
    const totalExpenses = reportExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSettlements = reportSettlements.reduce((sum, s) => sum + s.amount, 0);

    // Build Member Contribution Details for the selected month
    const memberSummary = group.members.map((member) => {
      const mId = member.userId;
      const mName = member.user.name;

      // Contribution (Total expenses paid by this member in the selected month)
      const contributed = reportExpenses
        .filter((e) => e.paidById === mId)
        .reduce((sum, e) => sum + e.amount, 0);

      // Share of Expenses (Total splits allocated to this member in the selected month)
      const share = reportExpenses.reduce((sum, e) => {
        const split = e.splits.find((s) => s.userId === mId);
        return sum + (split ? split.amount : 0);
      }, 0);

      // Settlements paid by this member in the selected month
      const settlementsPaid = reportSettlements
        .filter((s) => s.fromId === mId)
        .reduce((sum, s) => sum + s.amount, 0);

      // Total actual amount paid (Contribution + Settlements Paid)
      const totalPaid = contributed + settlementsPaid;

      // Net outstanding simplified balances (all time)
      const outstandingRecord = allTimeBalances.find((b) => b.userId === mId);
      const netOutstanding = outstandingRecord ? outstandingRecord.balance : 0;

      // Owed or Receivable from simplified debts
      const userOwed = allTimeDebts
        .filter((d) => d.fromId === mId)
        .reduce((sum, d) => sum + d.amount, 0);

      const userReceivable = allTimeDebts
        .filter((d) => d.toId === mId)
        .reduce((sum, d) => sum + d.amount, 0);

      return {
        userId: mId,
        name: mName,
        email: member.user.email,
        contributed,
        share,
        totalPaid,
        owed: userOwed,
        receivable: userReceivable,
        outstandingBalance: netOutstanding,
        settlementStatus: Math.abs(netOutstanding) < 0.05 ? "Settled" : netOutstanding > 0 ? "Receivable" : "Owed",
      };
    });

    // Compute Category breakdown of group expenses
    const categoryMap = new Map<string, { amount: number; count: number }>();
    for (const exp of reportExpenses) {
      // Find category of group expense (we default category to "Other" or use whatever category matches, prisma schema has category)
      const cat = (exp as Record<string, unknown>).category as string | undefined || "Other";
      const record = categoryMap.get(cat) || { amount: 0, count: 0 };
      record.amount += exp.amount;
      record.count += 1;
      categoryMap.set(cat, record);
    }

    const categorySummary = Array.from(categoryMap.entries()).map(([category, details]) => ({
      category,
      amount: details.amount,
      count: details.count,
      percentage: totalExpenses > 0 ? Math.round((details.amount / totalExpenses) * 10000) / 100 : 0,
    })).sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      groupName: group.name,
      description: group.description,
      reportingPeriod: monthLabel,
      month: monthStr ? parseInt(monthStr, 10) : null,
      year: yearStr ? parseInt(yearStr, 10) : null,
      summary: {
        totalMembers: group.members.length,
        totalExpenses,
        totalContributions: memberSummary.reduce((sum, m) => sum + m.contributed, 0),
        totalSettlements,
      },
      members: memberSummary,
      expenses: reportExpenses.map((e) => ({
        id: e.id,
        date: e.date,
        description: e.description,
        category: (e as Record<string, unknown>).category as string | undefined || "Other",
        paidBy: e.paidBy.name,
        amount: e.amount,
        paymentMethod: (e as Record<string, unknown>).paymentMethod as string | undefined || "CASH",
        notes: (e as Record<string, unknown>).notes as string | undefined || null,
        splits: e.splits.map((s) => ({ name: s.user.name, amount: s.amount })),
      })),
      settlements: reportSettlements.map((s) => ({
        id: s.id,
        date: s.createdAt,
        from: s.from.name,
        to: s.to.name,
        amount: s.amount,
      })),
      categorySummary,
    });
  } catch (error) {
    console.error("Failed to generate group report data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
