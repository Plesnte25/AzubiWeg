-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ActivityPing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pingedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityPing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyActiveMinutes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "minutes" INTEGER NOT NULL,

    CONSTRAINT "DailyActiveMinutes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityPing_userId_pingedAt_idx" ON "ActivityPing"("userId", "pingedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyActiveMinutes_userId_date_key" ON "DailyActiveMinutes"("userId", "date");

-- AddForeignKey
ALTER TABLE "ActivityPing" ADD CONSTRAINT "ActivityPing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyActiveMinutes" ADD CONSTRAINT "DailyActiveMinutes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
