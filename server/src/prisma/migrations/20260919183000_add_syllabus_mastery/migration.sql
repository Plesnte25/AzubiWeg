CREATE TYPE "SyllabusMasteryState" AS ENUM ('not_started', 'learning', 'passed', 'mastered');

ALTER TABLE "SyllabusItem"
ADD COLUMN "masteryState" "SyllabusMasteryState" NOT NULL DEFAULT 'not_started',
ADD COLUMN "reviewDueAt" TIMESTAMP(3),
ADD COLUMN "successfulAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastAttemptAt" TIMESTAMP(3);

CREATE INDEX "SyllabusItem_userId_reviewDueAt_idx"
ON "SyllabusItem"("userId", "reviewDueAt");
