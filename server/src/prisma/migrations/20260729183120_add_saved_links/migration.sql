-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resourcesSeededAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SavedLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "skill" "RoadmapSkill",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedLink_userId_skill_idx" ON "SavedLink"("userId", "skill");

-- AddForeignKey
ALTER TABLE "SavedLink" ADD CONSTRAINT "SavedLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
