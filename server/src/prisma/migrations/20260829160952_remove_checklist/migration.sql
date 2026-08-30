
-- DropForeignKey
ALTER TABLE "ChecklistItem" DROP CONSTRAINT "ChecklistItem_userId_fkey";

-- DropForeignKey
ALTER TABLE "UploadedFile" DROP CONSTRAINT "UploadedFile_checklistItemId_fkey";

-- AlterTable
ALTER TABLE "UploadedFile" DROP COLUMN "checklistItemId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "checklistSeededAt";

-- DropTable
DROP TABLE "ChecklistItem";

-- DropEnum
DROP TYPE "ChecklistCategory";

-- DropEnum
DROP TYPE "ChecklistStatus";

