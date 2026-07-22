-- AlterTable
ALTER TABLE "RoadmapDay" ADD COLUMN     "bonusAwardedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RoadmapTask" ADD COLUMN     "syllabusItemId" TEXT;

-- CreateIndex
CREATE INDEX "RoadmapTask_syllabusItemId_idx" ON "RoadmapTask"("syllabusItemId");

-- AddForeignKey
ALTER TABLE "RoadmapTask" ADD CONSTRAINT "RoadmapTask_syllabusItemId_fkey" FOREIGN KEY ("syllabusItemId") REFERENCES "SyllabusItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
