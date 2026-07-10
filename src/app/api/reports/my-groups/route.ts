import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeMemberBalances } from "@/lib/group-balances";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const monthStr = searchParams.get("month");
  const yearStr = searchParams.get("year");

  const now = new Date();
  const month = monthStr ? parseInt(monthStr, 10) : now.getMonth() + 1;
  const year = yearStr ? parseInt(yearStr, 10) : now.getFullYear();

  if (isNaN(month) || month < 1 || month > 12 || isNaN(year)) {
    return NextResponse.json({ error: "Invalid month or year parameters" }, { status: 400 });
  }

  // Calculate start and end date for the selected month in UTC bounds
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)); // Start of next month (exclusive)

  try {
    const userId = auth.session.user.id;

    // 1. Fetch all groups where the user is a member, including their detailed entities
    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: { include: { user: true } },
        expenses: {
          where: {
            date: {
              gte: startDate,
              lt: endDate,
            },
          },
          include: {
            paidBy: { select: { id: true, name: true } },
            splits: { include: { user: { select: { id: true, name: true } } } },
          },
        },
        settlements: {
          where: {
            createdAt: {
              gte: startDate,
              lt: endDate,
            },
          },
          include: {
            from: { select: { id: true, name: true } },
            to: { select: { id: true, name: true } },
          },
        },
      },
    });

    interface GroupReportItem {
      groupId: string;
      groupName: string;
      totalGroupExpenses: number;
      userContribution: number;
      userShare: number;
      amountPaid: number;
      outstandingBalance: number;
      settlementsPaid: number;
      settlementsReceived: number;
      settlementStatus: string;
      transactions: Array<{
        id: string;
        date: Date;
        description: string;
        amount: number;
        paidBy: string;
        userPaid: boolean;
        userShare: number;
      }>;
      settlements: Array<{
        id: string;
        date: Date;
        amount: number;
        from: string;
        to: string;
        userPaid: boolean;
      }>;
    }

    const groupsData: GroupReportItem[] = [];
    let overallTotalContributed = 0;
    let overallTotalShare = 0;
    let overallTotalSettlementsPaid = 0;
    let overallTotalSettlementsReceived = 0;

    for (const group of groups) {
      // Setup parameters for computeMemberBalances (need all historical context of the group for accurate net outstanding balance)
      // Wait, to compute the correct net balance, we need ALL expenses and settlements of the group, not just the filtered month!
      // But the report itself displays transactions filtered by month. This is an important distinction!
      // Let's fetch all historical balances first, then filter the transactions to display for the month.
      const allGroupData = await prisma.group.findUnique({
        where: { id: group.id },
        include: {
          members: { include: { user: true } },
          expenses: { include: { splits: true } },
          settlements: true,
        },
      });

      if (!allGroupData) continue;

      const membersInput = allGroupData.members.map((m) => ({
        userId: m.userId,
        name: m.user.name,
      }));

      const expensesInput = allGroupData.expenses.map((e) => ({
        amount: e.amount,
        paidById: e.paidById,
        splits: e.splits.map((s) => ({ userId: s.userId, amount: s.amount })),
      }));

      const settlementsInput = allGroupData.settlements.map((s) => ({
        amount: s.amount,
        fromId: s.fromId,
        toId: s.toId,
      }));

      const balances = computeMemberBalances(membersInput, expensesInput, settlementsInput);
      const userBalanceRecord = balances.find((b) => b.userId === userId);
      const outstandingBalance = userBalanceRecord ? userBalanceRecord.balance : 0;

      // Now compute statistics for the SELECTED REPORTING MONTH
      const monthExpenses = group.expenses;
      const monthSettlements = group.settlements;

      const totalGroupExpensesMonth = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

      // User's contribution in the selected month
      const userContributionMonth = monthExpenses
        .filter((e) => e.paidById === userId)
        .reduce((sum, e) => sum + e.amount, 0);

      // User's share of expenses in the selected month
      const userShareMonth = monthExpenses.reduce((sum, e) => {
        const userSplit = e.splits.find((s) => s.userId === userId);
        return sum + (userSplit ? userSplit.amount : 0);
      }, 0);

      // Total settlements paid by this user in the selected month
      const userSettlementsPaidMonth = monthSettlements
        .filter((s) => s.fromId === userId)
        .reduce((sum, s) => sum + s.amount, 0);

      // Total settlements received by this user in the selected month
      const userSettlementsReceivedMonth = monthSettlements
        .filter((s) => s.toId === userId)
        .reduce((sum, s) => sum + s.amount, 0);

      // Total actual amount paid by the user (Contribution + Settlements Paid)
      const amountPaidByUser = userContributionMonth + userSettlementsPaidMonth;

      // Filter transactions involving the logged-in user in this group in the selected month
      const userTransactions = monthExpenses
        .filter((e) => e.paidById === userId || e.splits.some((s) => s.userId === userId))
        .map((e) => {
          const userSplit = e.splits.find((s) => s.userId === userId);
          return {
            id: e.id,
            date: e.date,
            description: e.description,
            amount: e.amount,
            paidBy: e.paidBy.name,
            userPaid: e.paidById === userId,
            userShare: userSplit ? userSplit.amount : 0,
          };
        });

      // Filter settlements involving the logged-in user in this group in the selected month
      const userGroupSettlements = monthSettlements
        .filter((s) => s.fromId === userId || s.toId === userId)
        .map((s) => ({
          id: s.id,
          date: s.createdAt,
          amount: s.amount,
          from: s.from.name,
          to: s.to.name,
          userPaid: s.fromId === userId,
        }));

      overallTotalContributed += userContributionMonth;
      overallTotalShare += userShareMonth;
      overallTotalSettlementsPaid += userSettlementsPaidMonth;
      overallTotalSettlementsReceived += userSettlementsReceivedMonth;

      groupsData.push({
        groupId: group.id,
        groupName: group.name,
        totalGroupExpenses: totalGroupExpensesMonth,
        userContribution: userContributionMonth,
        userShare: userShareMonth,
        amountPaid: amountPaidByUser,
        outstandingBalance,
        settlementsPaid: userSettlementsPaidMonth,
        settlementsReceived: userSettlementsReceivedMonth,
        settlementStatus: Math.abs(outstandingBalance) < 0.05 ? "Settled" : outstandingBalance > 0 ? "Receivable" : "Owed",
        transactions: userTransactions,
        settlements: userGroupSettlements,
      });
    }

    return NextResponse.json({
      month,
      year,
      summary: {
        totalGroups: groups.length,
        totalContributed: overallTotalContributed,
        totalShare: overallTotalShare,
        totalOutstandingBalance: groupsData.reduce((sum, g) => sum + g.outstandingBalance, 0),
        totalSettlementsPaid: overallTotalSettlementsPaid,
        totalSettlementsReceived: overallTotalSettlementsReceived,
      },
      groups: groupsData,
    });
  } catch (error) {
    console.error("Failed to generate group summary report data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
