-- AlterTable
ALTER TABLE "User" ADD COLUMN "studyDays" BOOLEAN[] DEFAULT ARRAY[true, true, true, true, true, false, true]::BOOLEAN[],
ADD COLUMN "newWordsPerDay" INTEGER NOT NULL DEFAULT 10;

-- Capacity is now any 10–180 minutes in steps of 5 (was one of 5/20/45/90/180/330): clamp and round old values.
UPDATE "User" SET "studyCapacityMinutes" = LEAST(180, GREATEST(10, ROUND("studyCapacityMinutes" / 5.0) * 5));
