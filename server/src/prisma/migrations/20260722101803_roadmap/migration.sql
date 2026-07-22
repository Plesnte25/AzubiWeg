-- CreateEnum
CREATE TYPE "RoadmapTaskType" AS ENUM ('generic', 'vocab', 'study_source', 'milestone_test');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "roadmapStartedAt" DATE,
ADD COLUMN     "roadmapVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RoadmapDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOffset" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "theme" TEXT,

    CONSTRAINT "RoadmapDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapTask" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "type" "RoadmapTaskType" NOT NULL DEFAULT 'generic',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RoadmapTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoadmapDay_userId_date_idx" ON "RoadmapDay"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapDay_userId_dayOffset_key" ON "RoadmapDay"("userId", "dayOffset");

-- CreateIndex
CREATE INDEX "RoadmapTask_dayId_idx" ON "RoadmapTask"("dayId");

-- AddForeignKey
ALTER TABLE "RoadmapDay" ADD CONSTRAINT "RoadmapDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapTask" ADD CONSTRAINT "RoadmapTask_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "RoadmapDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
