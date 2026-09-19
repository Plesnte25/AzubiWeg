-- CreateEnum
CREATE TYPE "SyllabusExerciseType" AS ENUM ('free_text', 'self_check');

-- AlterTable
ALTER TABLE "SyllabusItem"
ADD COLUMN "learningOutcome" TEXT,
ADD COLUMN "resourceTitle" TEXT,
ADD COLUMN "resourceBody" TEXT,
ADD COLUMN "resourceUrl" TEXT,
ADD COLUMN "guidedPractice" TEXT,
ADD COLUMN "exerciseType" "SyllabusExerciseType",
ADD COLUMN "exercisePrompt" TEXT,
ADD COLUMN "exerciseAnswer" TEXT;

-- CreateTable
CREATE TABLE "ExerciseAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "syllabusItemId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExerciseAttempt_userId_syllabusItemId_createdAt_idx"
ON "ExerciseAttempt"("userId", "syllabusItemId", "createdAt");

-- AddForeignKey
ALTER TABLE "ExerciseAttempt"
ADD CONSTRAINT "ExerciseAttempt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAttempt"
ADD CONSTRAINT "ExerciseAttempt_syllabusItemId_fkey"
FOREIGN KEY ("syllabusItemId") REFERENCES "SyllabusItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
