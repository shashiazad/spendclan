import { Prisma } from "@prisma/client";

/**
 * Finds the active savings goal for a user.
 * An active savings goal is defined as the most recently created goal with a deadline in the future or no deadline.
 */
export async function getActiveSavingsGoal(
  tx: Omit<Prisma.TransactionClient, "$transaction">,
  userId: string
) {
  return tx.savingsGoal.findFirst({
    where: {
      userId,
      OR: [
        { deadline: null },
        { deadline: { gte: new Date() } }
      ]
    },
    orderBy: { createdAt: "desc" }
  });
}

/**
 * Updates the active savings goal's currentAmount by a delta value.
 * Clamps the resulting goal amount at 0.
 */
export async function updateActiveSavingsGoal(
  tx: Omit<Prisma.TransactionClient, "$transaction">,
  userId: string,
  delta: number
) {
  if (delta === 0) return;

  const goal = await getActiveSavingsGoal(tx, userId);
  if (!goal) return;

  const newAmount = Math.max(0, goal.currentAmount + delta);

  await tx.savingsGoal.update({
    where: { id: goal.id },
    data: { currentAmount: newAmount }
  });
}
