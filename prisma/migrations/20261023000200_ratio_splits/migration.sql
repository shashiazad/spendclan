-- Ratio splits (additive: a new enum value and a nullable column, no data changes).
-- Rollback: ALTER TABLE "GroupSplit" DROP COLUMN "ratio"; (Postgres can't drop an enum value;
-- leaving 'RATIO' in place is harmless if no expense uses it.)

-- AlterEnum
ALTER TYPE "SplitType" ADD VALUE 'RATIO';

-- AlterTable
ALTER TABLE "GroupSplit" ADD COLUMN "ratio" DOUBLE PRECISION;
