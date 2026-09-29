-- Capacity is now 60–720 minutes a day (was 10–180): an hour is the floor, and the default follows it.
ALTER TABLE "User" ALTER COLUMN "studyCapacityMinutes" SET DEFAULT 60;
UPDATE "User" SET "studyCapacityMinutes" = 60 WHERE "studyCapacityMinutes" < 60;
