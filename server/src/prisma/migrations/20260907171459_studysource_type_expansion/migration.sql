-- CreateEnum
CREATE TYPE "StudySourceUnitLabel" AS ENUM ('lessons', 'episodes', 'pages', 'chapters', 'modules');

-- AlterEnum
ALTER TYPE "FileKind" ADD VALUE 'source_cover';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StudySourceType" ADD VALUE 'audio';
ALTER TYPE "StudySourceType" ADD VALUE 'video';
ALTER TYPE "StudySourceType" ADD VALUE 'book';
ALTER TYPE "StudySourceType" ADD VALUE 'course';
ALTER TYPE "StudySourceType" ADD VALUE 'article';
ALTER TYPE "StudySourceType" ADD VALUE 'link';

-- AlterTable
ALTER TABLE "StudySource" ADD COLUMN     "coverFileId" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "unitLabel" "StudySourceUnitLabel" NOT NULL DEFAULT 'lessons',
ALTER COLUMN "type" SET DEFAULT 'link';

-- CreateIndex
CREATE UNIQUE INDEX "StudySource_coverFileId_key" ON "StudySource"("coverFileId");

-- AddForeignKey
ALTER TABLE "StudySource" ADD CONSTRAINT "StudySource_coverFileId_fkey" FOREIGN KEY ("coverFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

