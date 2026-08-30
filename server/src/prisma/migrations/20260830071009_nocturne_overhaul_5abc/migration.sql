-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "contextTag" TEXT,
ADD COLUMN     "wordId" TEXT;

-- AlterTable
ALTER TABLE "Word" ADD COLUMN     "conjugation" JSONB,
ADD COLUMN     "declension" JSONB;

-- CreateTable
CREATE TABLE "KaikkiEntry" (
    "id" TEXT NOT NULL,
    "headword" TEXT NOT NULL,
    "headwordLower" TEXT NOT NULL,
    "pos" TEXT NOT NULL,
    "gender" TEXT,
    "meaning" TEXT,
    "example" TEXT,
    "exampleTranslation" TEXT,
    "ipa" TEXT,
    "audioFilename" TEXT,
    "declension" JSONB,
    "conjugation" JSONB,
    "etymology" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KaikkiEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KaikkiForm" (
    "id" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "formLower" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,

    CONSTRAINT "KaikkiForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordFamilyRelation" (
    "id" TEXT NOT NULL,
    "headwordALower" TEXT NOT NULL,
    "headwordA" TEXT NOT NULL,
    "posA" TEXT NOT NULL,
    "headwordBLower" TEXT NOT NULL,
    "headwordB" TEXT NOT NULL,
    "posB" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WordFamilyRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "CefrLevel" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "score" INTEGER,
    "total" INTEGER,
    "passed" BOOLEAN,
    "sectionBreakdown" JSONB,

    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KaikkiEntry_headwordLower_idx" ON "KaikkiEntry"("headwordLower");

-- CreateIndex
CREATE INDEX "KaikkiForm_formLower_idx" ON "KaikkiForm"("formLower");

-- CreateIndex
CREATE INDEX "WordFamilyRelation_headwordALower_idx" ON "WordFamilyRelation"("headwordALower");

-- CreateIndex
CREATE INDEX "WordFamilyRelation_headwordBLower_idx" ON "WordFamilyRelation"("headwordBLower");

-- CreateIndex
CREATE INDEX "ExamAttempt_userId_level_startedAt_idx" ON "ExamAttempt"("userId", "level", "startedAt");

-- AddForeignKey
ALTER TABLE "KaikkiForm" ADD CONSTRAINT "KaikkiForm_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "KaikkiEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE SET NULL ON UPDATE CASCADE;
