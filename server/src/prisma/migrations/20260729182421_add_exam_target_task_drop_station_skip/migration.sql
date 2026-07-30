-- AlterTable
ALTER TABLE "RoadmapTask" ADD COLUMN     "droppedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SyllabusItem" ADD COLUMN     "skippedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "examTargetDate" DATE;
