-- CreateEnum
CREATE TYPE "WordCuration" AS ENUM ('generated', 'review', 'manual', 'mt');

-- AlterTable
ALTER TABLE "Word" ADD COLUMN     "curation" "WordCuration" NOT NULL DEFAULT 'generated',
ADD COLUMN     "reviewNote" TEXT;
