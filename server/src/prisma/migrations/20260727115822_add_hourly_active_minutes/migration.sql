-- CreateTable
CREATE TABLE "HourlyActiveMinutes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hour" INTEGER NOT NULL,
    "minutes" INTEGER NOT NULL,

    CONSTRAINT "HourlyActiveMinutes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HourlyActiveMinutes_userId_date_hour_key" ON "HourlyActiveMinutes"("userId", "date", "hour");

-- AddForeignKey
ALTER TABLE "HourlyActiveMinutes" ADD CONSTRAINT "HourlyActiveMinutes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
