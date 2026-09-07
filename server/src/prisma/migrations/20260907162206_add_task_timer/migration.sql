-- AlterTable
ALTER TABLE "RoadmapTask" ADD COLUMN     "timerRunningSince" TIMESTAMP(3),
ADD COLUMN     "timerSeconds" INTEGER NOT NULL DEFAULT 0;
