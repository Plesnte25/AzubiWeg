-- AlterTable
ALTER TABLE "RoadmapTask" ADD COLUMN     "estimateMinutes" INTEGER,
ADD COLUMN     "studySourceUnitId" TEXT;

-- AlterTable
ALTER TABLE "StudySource" ADD COLUMN     "dailyLesson" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "minutesPerUnit" INTEGER,
ADD COLUMN     "topicsFetchedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StudySourceUnit" ADD COLUMN     "culturePoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "grammarPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "vocabCount" INTEGER;

-- CreateIndex
CREATE INDEX "RoadmapTask_studySourceUnitId_idx" ON "RoadmapTask"("studySourceUnitId");

-- AddForeignKey
ALTER TABLE "RoadmapTask" ADD CONSTRAINT "RoadmapTask_studySourceUnitId_fkey" FOREIGN KEY ("studySourceUnitId") REFERENCES "StudySourceUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
