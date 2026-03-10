-- CreateEnum: SignupMode
CREATE TYPE "SignupMode" AS ENUM ('direct', 'application');

-- AlterEnum: add 'pending' to EventSignupStatus
ALTER TYPE "EventSignupStatus" ADD VALUE IF NOT EXISTS 'pending';

-- AlterTable: add signupMode to Event with default 'direct'
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "signupMode" "SignupMode" NOT NULL DEFAULT 'direct';

-- AlterTable: add intendedTaskId to EventSignup (application task intent)
ALTER TABLE "EventSignup" ADD COLUMN IF NOT EXISTS "intendedTaskId" TEXT;
