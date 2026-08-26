-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "noteId" TEXT;

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "skill" "RoadmapSkill",
    "syllabusItemId" TEXT,
    "roadmapTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Note_userId_createdAt_idx" ON "Note"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_syllabusItemId_fkey" FOREIGN KEY ("syllabusItemId") REFERENCES "SyllabusItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_roadmapTaskId_fkey" FOREIGN KEY ("roadmapTaskId") REFERENCES "RoadmapTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
