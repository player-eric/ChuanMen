-- AlterTable: change default signupMode from 'direct' to 'application'
ALTER TABLE "Event" ALTER COLUMN "signupMode" SET DEFAULT 'application';
