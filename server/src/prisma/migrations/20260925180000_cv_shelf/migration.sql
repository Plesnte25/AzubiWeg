-- CreateEnum
CREATE TYPE "CvKind" AS ENUM ('cv', 'letter', 'certificates');

-- DropIndex
DROP INDEX "UploadedFile_cvId_key";

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "cvVersion" INTEGER;

-- AlterTable
ALTER TABLE "Cv" DROP COLUMN "category",
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "CvKind" NOT NULL DEFAULT 'cv',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "cvVersion" INTEGER;

-- DropEnum
DROP TYPE "CvCategory";

-- Data: every existing document was a CV (Lebenslauf or ATS) with one file, so it's version 1; each user's most
-- recently updated CV becomes the default, and applications that point at a CV used version 1.
UPDATE "UploadedFile" SET "cvVersion" = 1 WHERE "cvId" IS NOT NULL;
UPDATE "Application" SET "cvVersion" = 1 WHERE "cvId" IS NOT NULL;
UPDATE "Cv" SET "isDefault" = true
WHERE "id" IN (SELECT DISTINCT ON ("userId") "id" FROM "Cv" ORDER BY "userId", "updatedAt" DESC);

-- At most one default document per user.
CREATE UNIQUE INDEX "Cv_one_default_per_user" ON "Cv" ("userId") WHERE "isDefault";
