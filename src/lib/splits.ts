import type { SplitType } from "@prisma/client";

/**
 * Turns an expense's split choice into exact per-person amounts, all in whole paise.
 * Equal: shared among the chosen participants (everyone by default); leftover paise go to the
 * payer if they share it, otherwise to the first participant. Percentage and Custom: validated
 * so the shares add up to the total exactly.
 */
export function computeSplits(
  splitType: SplitType,
  amount: number,
  memberIds: string[],
  paidById: string,
  splits?: { userId: string; amount: number; percentage?: number }[],
  participantIds?: string[],
  // People who have left the group but are already on the expense being edited
  formerIds: string[] = [],
): { splits: { userId: string; amount: number }[] } | { error: string } {
  const totalCents = Math.round(amount * 100);
  const allowedIds = [...memberIds, ...formerIds];

  if (splitType === "EQUAL") {
    // Equal split among the chosen participants (everyone by default)
    const participants = participantIds ?? memberIds;
    if (participants.length === 0) return { error: "Choose at least one person to split with" };
    if (new Set(participants).size !== participants.length) {
      return { error: "Each person can only appear once in a split" };
    }
    if (participants.some((uid) => !allowedIds.includes(uid))) {
      return { error: "All split users must be group members" };
    }

    const n = participants.length;
    const baseCents = Math.floor(totalCents / n);
    const remainderCents = totalCents - baseCents * n;
    // Leftover paise go to the payer when they share the expense, otherwise to the first participant
    const remainderTo = participants.includes(paidById) ? paidById : participants[0];

    const computed = participants.map((userId) => ({
      userId,
      amount: (baseCents + (userId === remainderTo ? remainderCents : 0)) / 100,
    }));

    return { splits: computed };
  }

  if (!splits?.length) {
    return { error: "Splits are required for PERCENTAGE and CUSTOM split types" };
  }

  for (const split of splits) {
    if (!allowedIds.includes(split.userId)) {
      return { error: "All split users must be group members" };
    }
  }

  // A subset of members is allowed; each person may appear only once
  const splitUserIds = new Set(splits.map((s) => s.userId));
  if (splitUserIds.size !== splits.length) {
    return { error: "Each person can only appear once in a split" };
  }

  if (splitType === "PERCENTAGE") {
    const hasPercentages = splits.some((s) => s.percentage !== undefined);

    if (hasPercentages) {
      const totalPercentCents = splits.reduce(
        (sum, s) => sum + Math.round((s.percentage ?? 0) * 100),
        0,
      );
      if (totalPercentCents !== 10000) {
        return { error: "Percentage splits must sum to exactly 100.00%" };
      }

      let sumSharesCents = 0;
      for (const s of splits) {
        const pct = s.percentage ?? 0;
        const expectedCents = Math.round((pct / 100) * totalCents);
        const actualCents = Math.round(s.amount * 100);

        if (Math.abs(actualCents - expectedCents) > 1) {
          const expectedVal = (expectedCents / 100).toFixed(2);
          return {
            error: `Split share for user ${s.userId} (${s.amount.toFixed(
              2,
            )}) does not match calculated share from percentage ${pct}% (${expectedVal})`,
          };
        }
        sumSharesCents += actualCents;
      }

      if (sumSharesCents !== totalCents) {
        const expected = amount.toFixed(2);
        const actual = (sumSharesCents / 100).toFixed(2);
        return {
          error: `Percentage split shares sum (${actual}) must equal the total expense amount (${expected}) exactly`,
        };
      }

      return { splits: splits.map(({ userId, amount }) => ({ userId, amount })) };
    } else {
      const totalPercentCents = splits.reduce(
        (sum, s) => sum + Math.round(s.amount * 100),
        0,
      );
      if (totalPercentCents !== 10000) {
        return { error: "Percentage splits must sum to exactly 100.00%" };
      }

      let computedCentsSum = 0;
      const computed = splits.map((s) => {
        const shareCents = Math.round((s.amount / 100) * totalCents);
        computedCentsSum += shareCents;
        return {
          userId: s.userId,
          amount: shareCents / 100,
          cents: shareCents,
        };
      });

      const remainderCents = totalCents - computedCentsSum;
      if (remainderCents !== 0 && computed.length > 0) {
        const payerSplit = computed.find((c) => c.userId === paidById);
        const target = payerSplit || computed[0];
        target.cents += remainderCents;
        target.amount = target.cents / 100;
      }

      return { splits: computed.map(({ userId, amount }) => ({ userId, amount })) };
    }
  }

  if (splitType === "CUSTOM") {
    const sumCents = splits.reduce((sum, s) => sum + Math.round(s.amount * 100), 0);
    if (sumCents !== totalCents) {
      const expected = amount.toFixed(2);
      const actual = (sumCents / 100).toFixed(2);
      return {
        error: `Custom splits sum (${actual}) must equal the total expense amount (${expected}) exactly`,
      };
    }

    return { splits };
  }

  return { error: "Invalid split type" };
}
