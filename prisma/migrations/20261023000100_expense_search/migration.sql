-- Expense search (additive only: one extension and five indexes, no data changes).
-- Rollback: DROP INDEX "GroupExpense_groupId_date_id_idx", "GroupExpense_groupId_paidById_idx",
--   "GroupExpense_groupId_amount_idx", "GroupExpense_description_idx", "GroupSplit_userId_groupExpenseId_idx";
--   then DELETE FROM "_prisma_migrations" WHERE migration_name = '20261023000100_expense_search'. The extension can stay.

-- Typo-tolerant description search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
-- Newest/oldest-first pages read this index in order. deletedAt is deliberately not part of it:
-- Postgres can't keep the index order after an "IS NULL" column, and almost every row is active.
CREATE INDEX "GroupExpense_groupId_date_id_idx" ON "GroupExpense"("groupId", "date" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "GroupExpense_groupId_paidById_idx" ON "GroupExpense"("groupId", "paidById");

-- CreateIndex
CREATE INDEX "GroupExpense_groupId_amount_idx" ON "GroupExpense"("groupId", "amount");

-- CreateIndex
CREATE INDEX "GroupExpense_description_idx" ON "GroupExpense" USING GIN ("description" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "GroupSplit_userId_groupExpenseId_idx" ON "GroupSplit"("userId", "groupExpenseId");
