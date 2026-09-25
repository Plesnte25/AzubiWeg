-- AlterEnum
ALTER TYPE "Grade" ADD VALUE 'again' BEFORE 'hard';

-- AlterTable
ALTER TABLE "ReviewLog" ADD COLUMN "prevDue" DATE,
ADD COLUMN "prevInterval" INTEGER,
ADD COLUMN "prevEase" INTEGER;
