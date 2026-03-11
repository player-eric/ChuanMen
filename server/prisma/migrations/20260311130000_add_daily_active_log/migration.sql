-- CreateTable
CREATE TABLE "DailyActiveLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "DailyActiveLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyActiveLog_date_idx" ON "DailyActiveLog"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyActiveLog_userId_date_key" ON "DailyActiveLog"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyActiveLog" ADD CONSTRAINT "DailyActiveLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
