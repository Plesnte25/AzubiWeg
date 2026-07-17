-- CreateEnum
CREATE TYPE "CefrLevel" AS ENUM ('a1', 'a2', 'b1');

-- CreateEnum
CREATE TYPE "SyllabusCategory" AS ENUM ('grammar', 'vocab_theme', 'skill');

-- CreateEnum
CREATE TYPE "StudySourceType" AS ENUM ('youtube', 'nicos_weg', 'duolingo', 'other');

-- CreateEnum
CREATE TYPE "QuizDirection" AS ENUM ('de_to_meaning', 'meaning_to_de');

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "studySourceId" TEXT,
ADD COLUMN     "syllabusItemId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "learningSeededAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SyllabusItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "CefrLevel" NOT NULL,
    "category" "SyllabusCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyllabusItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StudySourceType" NOT NULL DEFAULT 'other',
    "title" TEXT NOT NULL,
    "url" TEXT,
    "level" "CefrLevel",
    "totalUnits" INTEGER,
    "completedUnits" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySourceLog" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL DEFAULT 1,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudySourceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelfTestResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "QuizDirection" NOT NULL DEFAULT 'de_to_meaning',
    "lesson" TEXT,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SelfTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyllabusItem_userId_level_sortOrder_idx" ON "SyllabusItem"("userId", "level", "sortOrder");

-- CreateIndex
CREATE INDEX "StudySourceLog_sourceId_idx" ON "StudySourceLog"("sourceId");

-- CreateIndex
CREATE INDEX "SelfTestResult_userId_takenAt_idx" ON "SelfTestResult"("userId", "takenAt");

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_syllabusItemId_fkey" FOREIGN KEY ("syllabusItemId") REFERENCES "SyllabusItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_studySourceId_fkey" FOREIGN KEY ("studySourceId") REFERENCES "StudySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusItem" ADD CONSTRAINT "SyllabusItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySource" ADD CONSTRAINT "StudySource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySourceLog" ADD CONSTRAINT "StudySourceLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "StudySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfTestResult" ADD CONSTRAINT "SelfTestResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
