-- CreateEnum
CREATE TYPE "CvCategory" AS ENUM ('lebenslauf', 'ats');

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "cvId" TEXT;

-- The old builder-authored CVs have no uploaded file behind them (the CV
-- editor concept is being retired) and the new Cv.file relation isn't
-- optional in spirit — drop them rather than leave broken, file-less shelf
-- entries. No Application currently references a Cv (cvId is null on all
-- 18 rows), so this can't orphan a foreign key.
DELETE FROM "Cv";

-- AlterTable
ALTER TABLE "Cv" DROP COLUMN "content",
DROP COLUMN "photoFileId",
DROP COLUMN "template",
ADD COLUMN     "category" "CvCategory" NOT NULL DEFAULT 'lebenslauf';

-- AlterTable: position -> role and platform -> portal are renames (real
-- data in both columns), not drop+add, so existing applications keep their
-- values. contactEmail/contactName/notes/platformUrl are all null across
-- every existing row, safe to drop outright.
ALTER TABLE "Application" RENAME COLUMN "position" TO "role";
ALTER TABLE "Application" RENAME COLUMN "platform" TO "portal";
ALTER TABLE "Application" DROP COLUMN "contactEmail",
DROP COLUMN "contactName",
DROP COLUMN "notes",
DROP COLUMN "platformUrl",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "jobProfile" TEXT;

-- DropEnum
DROP TYPE "CvTemplate";

-- CreateIndex
CREATE UNIQUE INDEX "UploadedFile_cvId_key" ON "UploadedFile"("cvId");

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "Cv"("id") ON DELETE CASCADE ON UPDATE CASCADE;
