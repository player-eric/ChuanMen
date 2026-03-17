-- AlterTable: add notifReadAt to UserPreference
ALTER TABLE "UserPreference" ADD COLUMN "notifReadAt" TIMESTAMP(3);
