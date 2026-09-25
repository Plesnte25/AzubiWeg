-- AlterTable
ALTER TABLE "Note" ADD COLUMN "studySourceId" TEXT;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_studySourceId_fkey" FOREIGN KEY ("studySourceId") REFERENCES "StudySource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
