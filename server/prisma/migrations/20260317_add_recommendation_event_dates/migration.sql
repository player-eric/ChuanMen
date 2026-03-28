-- AlterTable: add optional event date fields for external_event recommendations
ALTER TABLE "Recommendation" ADD COLUMN "eventDate" TIMESTAMP(3);
ALTER TABLE "Recommendation" ADD COLUMN "eventEndDate" TIMESTAMP(3);
