-- CreateTable
CREATE TABLE "TatoebaPair" (
    "deId" INTEGER NOT NULL,
    "enId" INTEGER NOT NULL,
    "de" TEXT NOT NULL,
    "en" TEXT NOT NULL,
    "tokens" TEXT[],
    "wordCount" INTEGER NOT NULL,

    CONSTRAINT "TatoebaPair_pkey" PRIMARY KEY ("deId")
);

-- CreateIndex
CREATE INDEX "TatoebaPair_tokens_idx" ON "TatoebaPair" USING GIN ("tokens");
