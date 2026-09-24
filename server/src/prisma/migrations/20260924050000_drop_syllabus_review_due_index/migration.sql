-- Migration 20260919183000 recreated this index after 20260919150713 dropped it;
-- schema.prisma does not declare it, so drop it to match.
DROP INDEX IF EXISTS "SyllabusItem_userId_reviewDueAt_idx";
