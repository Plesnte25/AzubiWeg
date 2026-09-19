-- DropIndex
DROP INDEX "SyllabusItem_userId_reviewDueAt_idx";

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "durationSeconds" DOUBLE PRECISION;
