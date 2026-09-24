-- DropIndex
DROP INDEX IF EXISTS "SyllabusItem_userId_reviewDueAt_idx";

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "durationSeconds" DOUBLE PRECISION;
