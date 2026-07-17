-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('pending', 'done', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "SelfTestKind" AS ENUM ('vocab', 'mixed');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "platform" TEXT,
ADD COLUMN     "platformUrl" TEXT;

-- AlterTable
ALTER TABLE "SelfTestResult" ADD COLUMN     "breakdown" JSONB,
ADD COLUMN     "kind" "SelfTestKind" NOT NULL DEFAULT 'vocab',
ADD COLUMN     "level" "CefrLevel",
ADD COLUMN     "questionIds" JSONB;

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "extractedText" TEXT,
ADD COLUMN     "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'skipped';

-- CreateTable
CREATE TABLE "StudySourceUnit" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "videoId" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StudySourceUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudySourceUnit_sourceId_position_key" ON "StudySourceUnit"("sourceId", "position");

-- AddForeignKey
ALTER TABLE "StudySourceUnit" ADD CONSTRAINT "StudySourceUnit_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "StudySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalAccount" ADD CONSTRAINT "ExternalAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: existing counter sources with a known total get per-lesson units.
-- Deterministic ids (source id + position) are safe: cuid format is not
-- DB-enforced. completedAt=now() for already-counted lessons is fine — the
-- streak reads StudySourceLog, not unit timestamps.
INSERT INTO "StudySourceUnit" ("id", "sourceId", "position", "title", "completedAt")
SELECT s."id" || '-u' || gs.n, s."id", gs.n - 1, 'Lesson ' || gs.n,
       CASE WHEN gs.n <= LEAST(s."completedUnits", s."totalUnits") THEN now() ELSE NULL END
FROM "StudySource" s, LATERAL generate_series(1, s."totalUnits") AS gs(n)
WHERE s."totalUnits" IS NOT NULL;
