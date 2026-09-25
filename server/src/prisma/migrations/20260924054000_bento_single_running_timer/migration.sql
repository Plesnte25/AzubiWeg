-- Bento rule: one task timer runs at a time app-wide (routes/roadmap.ts now enforces it on start). Existing data can
-- have several running per user; keep each user's most recently started timer running and bank the rest, exactly
-- as services/learning/timer.ts bankTimer() would: add the elapsed whole seconds, stop, refresh minutesSpent.
-- Prisma stores these timestamp(3) columns as UTC, so "now" is taken in UTC too.
WITH running AS (
  SELECT t."id", t."timerSeconds", t."timerRunningSince", d."userId",
         ROW_NUMBER() OVER (PARTITION BY d."userId" ORDER BY t."timerRunningSince" DESC, t."id") AS rn
  FROM "RoadmapTask" t
  JOIN "RoadmapDay" d ON d."id" = t."dayId"
  WHERE t."timerRunningSince" IS NOT NULL
),
banked AS (
  SELECT "id",
         "timerSeconds" + GREATEST(0, FLOOR(EXTRACT(EPOCH FROM ((now() AT TIME ZONE 'UTC') - "timerRunningSince"))))::int AS seconds
  FROM running
  WHERE rn > 1
)
UPDATE "RoadmapTask" t
SET "timerSeconds" = b.seconds,
    "minutesSpent" = ROUND(b.seconds / 60.0)::int,
    "timerRunningSince" = NULL
FROM banked b
WHERE t."id" = b."id";
