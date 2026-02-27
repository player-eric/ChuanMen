/*
  Warnings:

  - You are about to drop the column `contentMd` on the `AboutContent` table. All the data in the column will be lost.
  - Added the required column `content` to the `AboutContent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "RecommendationCategory" ADD VALUE 'book';

-- AlterTable
ALTER TABLE "AboutContent" DROP COLUMN "contentMd",
ADD COLUMN     "content" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'announcement';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishAt" TIMESTAMP(3),
ALTER COLUMN "phase" SET DEFAULT 'open';

-- AlterTable
ALTER TABLE "Postcard" ADD COLUMN     "eventCtx" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "TitleRule" (
    "id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "stampEmoji" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TitleRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskPreset" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "roles" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TitleRule_name_idx" ON "TitleRule"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TaskPreset_tag_key" ON "TaskPreset"("tag");
