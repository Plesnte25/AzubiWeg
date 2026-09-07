-- DropForeignKey
ALTER TABLE "SavedLink" DROP CONSTRAINT "SavedLink_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "resourcesSeededAt";

-- DropTable
DROP TABLE "SavedLink";

