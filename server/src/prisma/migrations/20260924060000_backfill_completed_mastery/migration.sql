-- Level % (services/learning/stations.ts) counts passed + mastered syllabus items. Items completed before the
-- mastery system existed (2026-09-19) were never given a mastery state, so they'd count as 0 progress. Treat each
-- such completion as a pass: masteryState 'passed', no review scheduled (reviewDueAt stays null), attempt counters
-- untouched. Items already in learning/passed/mastered keep their state.
UPDATE "SyllabusItem"
SET "masteryState" = 'passed'
WHERE "completedAt" IS NOT NULL
  AND "masteryState" = 'not_started';
