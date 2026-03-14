-- CreateTable: DailyQuestion
CREATE TABLE "DailyQuestion" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetCategory" TEXT,
    "targetEntityType" TEXT,
    "date" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ActivitySignal
CREATE TABLE "ActivitySignal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivitySignal_pkey" PRIMARY KEY ("id")
);

-- AddColumn: User weekend status (legacy, replaced by ActivitySignal)
ALTER TABLE "User" ADD COLUMN "weekendStatus" TEXT;
ALTER TABLE "User" ADD COLUMN "weekendNote" TEXT;
ALTER TABLE "User" ADD COLUMN "weekendUpdatedAt" TIMESTAMP(3);

-- AddColumn: Recommendation.dailyQuestionId
ALTER TABLE "Recommendation" ADD COLUMN "dailyQuestionId" TEXT;

-- AddColumn: Proposal.dailyQuestionId
ALTER TABLE "Proposal" ADD COLUMN "dailyQuestionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DailyQuestion_date_key" ON "DailyQuestion"("date");
CREATE UNIQUE INDEX "ActivitySignal_userId_tag_weekKey_key" ON "ActivitySignal"("userId", "tag", "weekKey");
CREATE INDEX "ActivitySignal_weekKey_idx" ON "ActivitySignal"("weekKey");
CREATE INDEX "ActivitySignal_userId_idx" ON "ActivitySignal"("userId");

-- AddForeignKey
ALTER TABLE "ActivitySignal" ADD CONSTRAINT "ActivitySignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_dailyQuestionId_fkey" FOREIGN KEY ("dailyQuestionId") REFERENCES "DailyQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_dailyQuestionId_fkey" FOREIGN KEY ("dailyQuestionId") REFERENCES "DailyQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
