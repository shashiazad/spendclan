export type MemberBalance = {
  userId: string;
  name: string;
  balance: number;
};

export type SimplifiedDebt = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
};

type ExpenseInput = {
  amount: number;
  paidById: string;
  splits: { userId: string; amount: number }[];
};

type SettlementInput = {
  amount: number;
  fromId: string;
  toId: string;
};

type MemberInput = {
  userId: string;
  name: string;
};

export function computeMemberBalances(
  members: MemberInput[],
  expenses: ExpenseInput[],
  settlements: SettlementInput[],
): MemberBalance[] {
  const balances = new Map<string, number>();
  const names = new Map<string, string>();

  for (const member of members) {
    balances.set(member.userId, 0);
    names.set(member.userId, member.name);
  }

  for (const expense of expenses) {
    balances.set(
      expense.paidById,
      (balances.get(expense.paidById) ?? 0) + expense.amount,
    );
    for (const split of expense.splits) {
      balances.set(
        split.userId,
        (balances.get(split.userId) ?? 0) - split.amount,
      );
    }
  }

  for (const settlement of settlements) {
    balances.set(
      settlement.fromId,
      (balances.get(settlement.fromId) ?? 0) + settlement.amount,
    );
    balances.set(
      settlement.toId,
      (balances.get(settlement.toId) ?? 0) - settlement.amount,
    );
  }

  return Array.from(balances.entries()).map(([userId, balance]) => ({
    userId,
    name: names.get(userId) ?? "Unknown",
    balance: Math.round(balance * 100) / 100,
  }));
}

export function simplifyDebts(
  balances: MemberBalance[],
  threshold = 0.01,
): SimplifiedDebt[] {
  const creditors = balances
    .filter((b) => b.balance > threshold)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance - a.balance);

  const debtors = balances
    .filter((b) => b.balance < -threshold)
    .map((b) => ({ ...b, balance: -b.balance }))
    .sort((a, b) => b.balance - a.balance);

  const debts: SimplifiedDebt[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].balance, creditors[j].balance);
    if (amount > threshold) {
      debts.push({
        fromId: debtors[i].userId,
        fromName: debtors[i].name,
        toId: creditors[j].userId,
        toName: creditors[j].name,
        amount: Math.round(amount * 100) / 100,
      });
    }
    debtors[i].balance -= amount;
    creditors[j].balance -= amount;
    if (debtors[i].balance <= threshold) i++;
    if (creditors[j].balance <= threshold) j++;
  }

  return debts;
}

export function buildEqualSplits(
  memberIds: string[],
  totalAmount: number,
): { userId: string; amount: number }[] {
  const count = memberIds.length;
  if (count === 0) return [];

  const base = Math.floor((totalAmount / count) * 100) / 100;
  const splits = memberIds.map((userId) => ({ userId, amount: base }));
  const remainder =
    Math.round((totalAmount - base * count) * 100) / 100;

  if (remainder !== 0 && splits.length > 0) {
    splits[0].amount = Math.round((splits[0].amount + remainder) * 100) / 100;
  }

  return splits;
}
