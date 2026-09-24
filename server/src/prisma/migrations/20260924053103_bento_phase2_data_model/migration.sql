-- CreateEnum
CREATE TYPE "GermanLevel" AS ENUM ('a1', 'a2', 'b1', 'b2', 'c1', 'c2');

-- CreateEnum
CREATE TYPE "ExamMode" AS ENUM ('real', 'mock');

-- CreateEnum
CREATE TYPE "NoteCategory" AS ENUM ('grammar', 'mistakes', 'everyday', 'jobs', 'listening');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SelfTestKind" ADD VALUE 'gender_drill';
ALTER TYPE "SelfTestKind" ADD VALUE 'listen_type';
ALTER TYPE "SelfTestKind" ADD VALUE 'checkpoint';

-- AlterTable
ALTER TABLE "ActivityPing" ADD COLUMN     "learning" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "germanLevel" "GermanLevel";

-- AlterTable
ALTER TABLE "DailyActiveMinutes" ADD COLUMN     "learningMinutes" INTEGER;

-- AlterTable
ALTER TABLE "ExamAttempt" ADD COLUMN     "mode" "ExamMode" NOT NULL DEFAULT 'real';

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "applicationId" TEXT,
ADD COLUMN     "category" "NoteCategory" NOT NULL DEFAULT 'everyday',
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resurfaceDueAt" DATE,
ADD COLUMN     "resurfaceStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stationKey" TEXT;

-- AlterTable
ALTER TABLE "SelfTestResult" ADD COLUMN     "checkpointIndex" INTEGER;

-- AlterTable
ALTER TABLE "StudySource" ADD COLUMN     "stationKey" TEXT;

-- CreateTable
CREATE TABLE "ApplicationPhrase" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationPhrase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationPhrase_applicationId_idx" ON "ApplicationPhrase"("applicationId");

-- CreateIndex
CREATE INDEX "Note_userId_resurfaceDueAt_idx" ON "Note"("userId", "resurfaceDueAt");

-- AddForeignKey
ALTER TABLE "ApplicationPhrase" ADD CONSTRAINT "ApplicationPhrase_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
