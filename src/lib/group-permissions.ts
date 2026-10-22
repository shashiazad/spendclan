/**
 * Group permission rules, kept in one place so routes and UI agree.
 *
 * Expenses: only the person who added an expense may edit, delete or restore it.
 * Expenses created before the creator was recorded fall back to the payer.
 */
export function expenseOwnerId(expense: { createdById: string | null; paidById: string }): string {
  return expense.createdById ?? expense.paidById;
}

export function canModifyExpense(
  expense: { createdById: string | null; paidById: string },
  userId: string,
): boolean {
  return expenseOwnerId(expense) === userId;
}

export const EXPENSE_FORBIDDEN_MESSAGE = "Only the person who added this expense can change it.";
