-- CreateEnum
CREATE TYPE "RoadmapSkill" AS ENUM ('grammar', 'vocab', 'listening', 'speaking', 'writing', 'reading', 'bureaucracy', 'milestone', 'reflection');

-- AlterEnum
ALTER TYPE "FileKind" ADD VALUE 'audio_recording';

-- AlterTable
ALTER TABLE "RoadmapTask" ADD COLUMN     "journalEntry" TEXT,
ADD COLUMN     "minutesSpent" INTEGER,
ADD COLUMN     "skill" "RoadmapSkill";

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "roadmapTaskId" TEXT;

-- CreateIndex
CREATE INDEX "RoadmapTask_skill_idx" ON "RoadmapTask"("skill");

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_roadmapTaskId_fkey" FOREIGN KEY ("roadmapTaskId") REFERENCES "RoadmapTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
