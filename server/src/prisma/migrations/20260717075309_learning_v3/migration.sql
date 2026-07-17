-- AlterTable
ALTER TABLE "ExternalAccount" ADD COLUMN     "lastCheckedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StudySourceUnit" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "SyllabusItem" ADD COLUMN     "theme" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "syllabusVersion" INTEGER NOT NULL DEFAULT 0;
