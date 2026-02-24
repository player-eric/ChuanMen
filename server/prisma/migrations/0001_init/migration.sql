-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('contributor', 'regular');

-- CreateEnum
CREATE TYPE "EventTag" AS ENUM ('movie', 'chuanmen', 'holiday', 'hiking', 'outdoor', 'small_group', 'other');

-- CreateEnum
CREATE TYPE "EventPhase" AS ENUM ('invite', 'open', 'live', 'ended', 'cancelled');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('applicant', 'approved', 'rejected', 'banned');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('scheduled', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "EventSignupStatus" AS ENUM ('invited', 'offered', 'accepted', 'waitlist', 'declined', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "RecommendationCategory" AS ENUM ('movie', 'recipe', 'music', 'place');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('candidate', 'featured', 'archived');

-- CreateEnum
CREATE TYPE "MovieStatus" AS ENUM ('candidate', 'screened');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('discussing', 'scheduled', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "PostcardVisibility" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "SeedStatus" AS ENUM ('active', 'paused', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "SeedCollaboratorStatus" AS ENUM ('invited', 'active', 'rejected', 'left');

-- CreateEnum
CREATE TYPE "AboutContentType" AS ENUM ('principle', 'host_guide', 'letter', 'about');

-- CreateEnum
CREATE TYPE "WeeklyLotteryStatus" AS ENUM ('pending', 'accepted', 'completed', 'skipped');

-- CreateEnum
CREATE TYPE "PushFrequency" AS ENUM ('low', 'normal', 'high');

-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('pending', 'uploaded');

-- CreateEnum
CREATE TYPE "InteractionEntityType" AS ENUM ('event', 'movie', 'proposal', 'postcard', 'seed', 'seed_update', 'discussion', 'comment', 'announcement');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'member',
    "city" TEXT NOT NULL DEFAULT '',
    "hostCount" INTEGER NOT NULL DEFAULT 0,
    "participationCount" INTEGER NOT NULL DEFAULT 0,
    "proposalCount" INTEGER NOT NULL DEFAULT 0,
    "postcardSentCount" INTEGER NOT NULL DEFAULT 0,
    "postcardReceivedCount" INTEGER NOT NULL DEFAULT 0,
    "membershipStatus" "MembershipStatus" NOT NULL DEFAULT 'regular',
    "userStatus" "UserStatus" NOT NULL DEFAULT 'applicant',
    "googleId" TEXT,
    "wechatId" TEXT NOT NULL DEFAULT '',
    "hideEmail" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT NOT NULL DEFAULT '',
    "selfAsFriend" TEXT NOT NULL DEFAULT '',
    "idealFriend" TEXT NOT NULL DEFAULT '',
    "participationPlan" TEXT NOT NULL DEFAULT '',
    "coverImageUrl" TEXT NOT NULL DEFAULT '',
    "referralSource" TEXT NOT NULL DEFAULT '',
    "defaultHouseRules" TEXT NOT NULL DEFAULT '',
    "homeAddress" TEXT NOT NULL DEFAULT '',
    "postcardCredits" INTEGER NOT NULL DEFAULT 2,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOperatorRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserOperatorRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSocialTitle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSocialTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pushEmail" BOOLEAN NOT NULL DEFAULT true,
    "pushFrequency" "PushFrequency" NOT NULL DEFAULT 'normal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMutedGoal" (
    "id" TEXT NOT NULL,
    "userPreferenceId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "UserMutedGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "proposalId" TEXT,
    "titleImageUrl" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "houseRules" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "tag" "EventTag" NOT NULL DEFAULT 'other',
    "phase" "EventPhase" NOT NULL DEFAULT 'invite',
    "status" "EventStatus" NOT NULL DEFAULT 'scheduled',
    "selectedMovieId" TEXT,
    "recap" TEXT NOT NULL DEFAULT '',
    "recapPhotoUrls" TEXT[],
    "recorderUserId" TEXT,
    "waitlistEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isWeeklyLotteryEvent" BOOLEAN NOT NULL DEFAULT false,
    "inviteDeadline" TIMESTAMP(3),
    "isHomeEvent" BOOLEAN NOT NULL DEFAULT false,
    "locationPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventCoHost" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EventCoHost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventVisibilityExclusion" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EventVisibilityExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSignup" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedById" TEXT,
    "status" "EventSignupStatus" NOT NULL DEFAULT 'invited',
    "invitedAt" TIMESTAMP(3),
    "offeredAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "participated" BOOLEAN NOT NULL DEFAULT false,
    "checkedInAt" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSignup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "category" "RecommendationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "authorId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT NOT NULL DEFAULT '',
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'candidate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationTag" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "RecommendationTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "director" TEXT NOT NULL DEFAULT '',
    "poster" TEXT NOT NULL DEFAULT '',
    "doubanUrl" TEXT NOT NULL DEFAULT '',
    "doubanRating" DOUBLE PRECISION,
    "synopsis" TEXT NOT NULL DEFAULT '',
    "recommendedById" TEXT NOT NULL,
    "status" "MovieStatus" NOT NULL DEFAULT 'candidate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieScreening" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "MovieScreening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieVote" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "authorId" TEXT NOT NULL,
    "organizerId" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'discussing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalVote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Postcard" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "eventId" TEXT,
    "message" TEXT NOT NULL,
    "visibility" "PostcardVisibility" NOT NULL DEFAULT 'private',
    "photoUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Postcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostcardTag" (
    "id" TEXT NOT NULL,
    "postcardId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "PostcardTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seed" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "authorId" TEXT NOT NULL,
    "status" "SeedStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeedCollaborator" (
    "id" TEXT NOT NULL,
    "seedId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleLabel" TEXT NOT NULL DEFAULT '',
    "status" "SeedCollaboratorStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeedCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeedUpdate" (
    "id" TEXT NOT NULL,
    "seedId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeedUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeedUpdateMedia" (
    "id" TEXT NOT NULL,
    "seedUpdateId" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "SeedUpdateMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discussion" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "entityType" "InteractionEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "entityType" "InteractionEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AboutContent" (
    "id" TEXT NOT NULL,
    "type" "AboutContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "contentMd" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyLottery" (
    "id" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "drawnMemberId" TEXT NOT NULL,
    "status" "WeeklyLotteryStatus" NOT NULL DEFAULT 'pending',
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyLottery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentPairing" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "metAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperimentPairing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostcardPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amountUsd" INTEGER NOT NULL,
    "stripeId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostcardPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "ownerId" TEXT,
    "contentType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'pending',
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserOperatorRole_userId_value_key" ON "UserOperatorRole"("userId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "UserSocialTitle_userId_value_key" ON "UserSocialTitle"("userId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMutedGoal_userPreferenceId_value_key" ON "UserMutedGoal"("userPreferenceId", "value");

-- CreateIndex
CREATE INDEX "Event_startsAt_phase_idx" ON "Event"("startsAt", "phase");

-- CreateIndex
CREATE INDEX "Event_startsAt_status_idx" ON "Event"("startsAt" DESC, "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventCoHost_eventId_userId_key" ON "EventCoHost"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventVisibilityExclusion_eventId_userId_key" ON "EventVisibilityExclusion"("eventId", "userId");

-- CreateIndex
CREATE INDEX "EventSignup_eventId_status_createdAt_idx" ON "EventSignup"("eventId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventSignup_eventId_userId_key" ON "EventSignup"("eventId", "userId");

-- CreateIndex
CREATE INDEX "Recommendation_category_createdAt_idx" ON "Recommendation"("category", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Recommendation_title_idx" ON "Recommendation"("title");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationTag_recommendationId_value_key" ON "RecommendationTag"("recommendationId", "value");

-- CreateIndex
CREATE INDEX "Movie_status_createdAt_idx" ON "Movie"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Movie_title_idx" ON "Movie"("title");

-- CreateIndex
CREATE UNIQUE INDEX "MovieScreening_movieId_eventId_key" ON "MovieScreening"("movieId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieVote_movieId_userId_key" ON "MovieVote"("movieId", "userId");

-- CreateIndex
CREATE INDEX "Proposal_status_createdAt_idx" ON "Proposal"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Proposal_title_idx" ON "Proposal"("title");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalVote_proposalId_userId_key" ON "ProposalVote"("proposalId", "userId");

-- CreateIndex
CREATE INDEX "Postcard_toId_createdAt_idx" ON "Postcard"("toId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Postcard_fromId_createdAt_idx" ON "Postcard"("fromId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PostcardTag_postcardId_value_key" ON "PostcardTag"("postcardId", "value");

-- CreateIndex
CREATE INDEX "Seed_status_updatedAt_idx" ON "Seed"("status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Seed_title_idx" ON "Seed"("title");

-- CreateIndex
CREATE UNIQUE INDEX "SeedCollaborator_seedId_userId_key" ON "SeedCollaborator"("seedId", "userId");

-- CreateIndex
CREATE INDEX "SeedUpdate_seedId_createdAt_idx" ON "SeedUpdate"("seedId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Discussion_createdAt_idx" ON "Discussion"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Like_entityType_entityId_createdAt_idx" ON "Like"("entityType", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Like_entityType_entityId_userId_key" ON "Like"("entityType", "entityId", "userId");

-- CreateIndex
CREATE INDEX "Comment_entityType_entityId_createdAt_idx" ON "Comment"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AboutContent_type_updatedAt_idx" ON "AboutContent"("type", "updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyLottery_weekKey_key" ON "WeeklyLottery"("weekKey");

-- CreateIndex
CREATE INDEX "WeeklyLottery_createdAt_idx" ON "WeeklyLottery"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentPairing_experimentId_userAId_userBId_key" ON "ExperimentPairing"("experimentId", "userAId", "userBId");

-- CreateIndex
CREATE INDEX "Announcement_createdAt_idx" ON "Announcement"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "PostcardPurchase_userId_createdAt_idx" ON "PostcardPurchase"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_key_key" ON "MediaAsset"("key");

-- AddForeignKey
ALTER TABLE "UserOperatorRole" ADD CONSTRAINT "UserOperatorRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSocialTitle" ADD CONSTRAINT "UserSocialTitle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMutedGoal" ADD CONSTRAINT "UserMutedGoal_userPreferenceId_fkey" FOREIGN KEY ("userPreferenceId") REFERENCES "UserPreference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_selectedMovieId_fkey" FOREIGN KEY ("selectedMovieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_recorderUserId_fkey" FOREIGN KEY ("recorderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCoHost" ADD CONSTRAINT "EventCoHost_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCoHost" ADD CONSTRAINT "EventCoHost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventVisibilityExclusion" ADD CONSTRAINT "EventVisibilityExclusion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventVisibilityExclusion" ADD CONSTRAINT "EventVisibilityExclusion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSignup" ADD CONSTRAINT "EventSignup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSignup" ADD CONSTRAINT "EventSignup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationTag" ADD CONSTRAINT "RecommendationTag_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movie" ADD CONSTRAINT "Movie_recommendedById_fkey" FOREIGN KEY ("recommendedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieScreening" ADD CONSTRAINT "MovieScreening_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieScreening" ADD CONSTRAINT "MovieScreening_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieVote" ADD CONSTRAINT "MovieVote_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieVote" ADD CONSTRAINT "MovieVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalVote" ADD CONSTRAINT "ProposalVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalVote" ADD CONSTRAINT "ProposalVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postcard" ADD CONSTRAINT "Postcard_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postcard" ADD CONSTRAINT "Postcard_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postcard" ADD CONSTRAINT "Postcard_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostcardTag" ADD CONSTRAINT "PostcardTag_postcardId_fkey" FOREIGN KEY ("postcardId") REFERENCES "Postcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seed" ADD CONSTRAINT "Seed_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeedCollaborator" ADD CONSTRAINT "SeedCollaborator_seedId_fkey" FOREIGN KEY ("seedId") REFERENCES "Seed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeedCollaborator" ADD CONSTRAINT "SeedCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeedUpdate" ADD CONSTRAINT "SeedUpdate_seedId_fkey" FOREIGN KEY ("seedId") REFERENCES "Seed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeedUpdate" ADD CONSTRAINT "SeedUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeedUpdateMedia" ADD CONSTRAINT "SeedUpdateMedia_seedUpdateId_fkey" FOREIGN KEY ("seedUpdateId") REFERENCES "SeedUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyLottery" ADD CONSTRAINT "WeeklyLottery_drawnMemberId_fkey" FOREIGN KEY ("drawnMemberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyLottery" ADD CONSTRAINT "WeeklyLottery_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentPairing" ADD CONSTRAINT "ExperimentPairing_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentPairing" ADD CONSTRAINT "ExperimentPairing_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostcardPurchase" ADD CONSTRAINT "PostcardPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
┌─────────────────────────────────────────────────────────┐
│  Update available 6.19.2 -> 7.4.1                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘

