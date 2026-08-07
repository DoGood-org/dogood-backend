-- CreateTable
CREATE TABLE "OrganizationJoinRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverOrganizationId" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationInvite" (
    "id" TEXT NOT NULL,
    "senderOrganizationId" TEXT NOT NULL,
    "receiverUserId" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReview" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "authorType" "ReviewAuthorType" NOT NULL,
    "authorUserId" TEXT,
    "authorOrganizationId" TEXT,
    "targetUserId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UserReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationReview" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "authorType" "ReviewAuthorType" NOT NULL,
    "authorUserId" TEXT,
    "authorOrganizationId" TEXT,
    "targetOrganizationId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskReview" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "authorType" "ReviewAuthorType" NOT NULL,
    "authorUserId" TEXT,
    "authorOrganizationId" TEXT,
    "taskId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TaskReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemReview" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "authorType" "ReviewAuthorType" NOT NULL,
    "authorUserId" TEXT,
    "authorOrganizationId" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SystemReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskParticipant" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TaskParticipant_pkey" PRIMARY KEY ("id")
);

INSERT INTO "TaskReview" ("id", "rating", "comment", "authorType", "authorUserId", "authorOrganizationId", "taskId", "hostId", "status", "createdAt", "updatedAt")
SELECT r."id", r."rating", r."comment", r."authorType", r."authorUserId", r."authorOrganizationId", r."taskId", t."hostId", r."status", r."createdAt", r."updatedAt"
FROM "Review" r
JOIN "Task" t ON t."id" = r."taskId"
WHERE r."taskId" IS NOT NULL;

INSERT INTO "UserReview" ("id", "rating", "comment", "authorType", "authorUserId", "authorOrganizationId", "targetUserId", "status", "createdAt", "updatedAt")
SELECT r."id", r."rating", r."comment", r."authorType", r."authorUserId", r."authorOrganizationId", r."targetUserId", r."status", r."createdAt", r."updatedAt"
FROM "Review" r
WHERE r."taskId" IS NULL AND r."targetType" = 'USER' AND r."targetUserId" IS NOT NULL;

INSERT INTO "OrganizationReview" ("id", "rating", "comment", "authorType", "authorUserId", "authorOrganizationId", "targetOrganizationId", "status", "createdAt", "updatedAt")
SELECT r."id", r."rating", r."comment", r."authorType", r."authorUserId", r."authorOrganizationId", r."targetOrganizationId", r."status", r."createdAt", r."updatedAt"
FROM "Review" r
WHERE r."taskId" IS NULL AND r."targetType" = 'ORGANIZATION' AND r."targetOrganizationId" IS NOT NULL;

INSERT INTO "SystemReview" ("id", "rating", "comment", "authorType", "authorUserId", "authorOrganizationId", "status", "createdAt", "updatedAt")
SELECT r."id", r."rating", r."comment", r."authorType", r."authorUserId", r."authorOrganizationId", r."status", r."createdAt", r."updatedAt"
FROM "Review" r
WHERE r."taskId" IS NULL AND r."targetType" = 'PLATFORM';

INSERT INTO "OrganizationJoinRequest" ("id", "senderId", "receiverOrganizationId", "status", "createdAt", "updatedAt")
SELECT "id", "senderId", "receiverOrganizationId", "status", "createdAt", "updatedAt"
FROM "JoinRequest"
WHERE "direction" = 'FROM_USER' AND "senderId" IS NOT NULL AND "receiverOrganizationId" IS NOT NULL;

INSERT INTO "OrganizationInvite" ("id", "senderOrganizationId", "receiverUserId", "status", "createdAt", "updatedAt")
SELECT "id", "senderOrganizationId", "receiverUserId", "status", "createdAt", "updatedAt"
FROM "JoinRequest"
WHERE "direction" = 'FROM_ORGANIZATION' AND "senderOrganizationId" IS NOT NULL AND "receiverUserId" IS NOT NULL;

INSERT INTO "TaskParticipant" ("id", "taskId", "userId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, j."A", j."B", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "_JoinedTasks" j;

DO $$
DECLARE
  lost_reviews INTEGER;
  lost_requests INTEGER;
BEGIN
  SELECT count(*) INTO lost_reviews
  FROM "Review" r
  WHERE r."taskId" IS NULL
    AND ((r."targetType" = 'USER' AND r."targetUserId" IS NULL)
      OR (r."targetType" = 'ORGANIZATION' AND r."targetOrganizationId" IS NULL));

  SELECT count(*) INTO lost_requests
  FROM "JoinRequest"
  WHERE ("direction" = 'FROM_USER' AND ("senderId" IS NULL OR "receiverOrganizationId" IS NULL))
     OR ("direction" = 'FROM_ORGANIZATION' AND ("senderOrganizationId" IS NULL OR "receiverUserId" IS NULL));

  IF lost_reviews > 0 THEN
    RAISE WARNING 'Review: % строк не перенесено (пустой обязательный target)', lost_reviews;
  END IF;
  IF lost_requests > 0 THEN
    RAISE WARNING 'JoinRequest: % строк не перенесено (пустой обязательный участник)', lost_requests;
  END IF;
END $$;

ALTER TABLE "ChatRoom" RENAME TO "Chat";
ALTER TABLE "Chat" RENAME CONSTRAINT "ChatRoom_pkey" TO "Chat_pkey";
ALTER TABLE "Chat" RENAME CONSTRAINT "ChatRoom_ownerId_fkey" TO "Chat_ownerId_fkey";
ALTER TABLE "Chat" ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "UserStatusesInChat" RENAME TO "ChatMembership";
ALTER TABLE "ChatMembership" RENAME CONSTRAINT "UserStatusesInChat_pkey" TO "ChatMembership_pkey";
ALTER TABLE "ChatMembership" RENAME CONSTRAINT "UserStatusesInChat_roomId_fkey" TO "ChatMembership_chatId_fkey";
ALTER TABLE "ChatMembership" RENAME CONSTRAINT "UserStatusesInChat_userId_fkey" TO "ChatMembership_userId_fkey";
ALTER TABLE "ChatMembership" RENAME COLUMN "roomId" TO "chatId";
ALTER INDEX "UserStatusesInChat_userId_roomId_key" RENAME TO "ChatMembership_userId_chatId_key";

UPDATE "ChatMembership" SET "leftAt" = CURRENT_TIMESTAMP WHERE "wasLeft" = true AND "leftAt" IS NULL;
ALTER TABLE "ChatMembership" DROP COLUMN "wasLeft";

ALTER TABLE "ChatMembership" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3);
UPDATE "ChatMembership" SET "createdAt" = "joinedAt", "updatedAt" = "joinedAt";
ALTER TABLE "ChatMembership" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "ChatMessage" RENAME COLUMN "roomId" TO "chatId";
ALTER TABLE "ChatMessage" RENAME CONSTRAINT "ChatMessage_roomId_fkey" TO "ChatMessage_chatId_fkey";
ALTER INDEX "ChatMessage_roomId_idx" RENAME TO "ChatMessage_chatId_idx";
ALTER INDEX "ChatMessage_roomId_createdAt_idx" RENAME TO "ChatMessage_chatId_createdAt_idx";

ALTER TABLE "Organization" RENAME COLUMN "moreInfo" TO "additionalInfo";
ALTER TABLE "Organization" RENAME COLUMN "avatar" TO "avatarUrl";

-- AlterTable
ALTER TABLE "Location" ADD COLUMN "name" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3);
ALTER TABLE "Location" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3);
UPDATE "Organization" SET "updatedAt" = "createdAt";
ALTER TABLE "Organization" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserOrganization" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3);
UPDATE "UserOrganization" SET "updatedAt" = "createdAt";
ALTER TABLE "UserOrganization" ALTER COLUMN "updatedAt" DROP DEFAULT;

UPDATE "Donate" SET "userId" = NULL
WHERE "userId" IS NOT NULL AND "organizationId" IS NOT NULL AND "donationType" = 'ORGANIZATION';

UPDATE "Donate" SET "organizationId" = NULL
WHERE "userId" IS NOT NULL AND "organizationId" IS NOT NULL AND "donationType" = 'USER';

UPDATE "Donate" SET "userId" = NULL, "organizationId" = NULL
WHERE "donationType" = 'PLATFORM' AND ("userId" IS NOT NULL OR "organizationId" IS NOT NULL);

UPDATE "Donate" d SET "userId" = NULL
WHERE d."userId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = d."userId");

UPDATE "Donate" d SET "organizationId" = NULL
WHERE d."organizationId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Organization" o WHERE o."id" = d."organizationId");

-- AlterTable
ALTER TABLE "Donate" DROP COLUMN "donationType",
ADD COLUMN     "deletedAt" TIMESTAMP(3);

ALTER TABLE "Donate" ADD CONSTRAINT "Donate_single_recipient_check"
CHECK ("userId" IS NULL OR "organizationId" IS NULL);

-- DropTable
DROP TABLE "Review";

-- DropTable
DROP TABLE "JoinRequest";

-- DropTable
DROP TABLE "Platform";

-- DropTable
DROP TABLE "_JoinedTasks";

-- DropEnum
DROP TYPE "DonateType";

-- DropEnum
DROP TYPE "JoinRequestDirection";

-- DropEnum
DROP TYPE "ReviewTargetType";

-- CreateIndex
CREATE INDEX "OrganizationJoinRequest_senderId_idx" ON "OrganizationJoinRequest"("senderId");

-- CreateIndex
CREATE INDEX "OrganizationJoinRequest_receiverOrganizationId_idx" ON "OrganizationJoinRequest"("receiverOrganizationId");

-- CreateIndex
CREATE INDEX "OrganizationInvite_senderOrganizationId_idx" ON "OrganizationInvite"("senderOrganizationId");

-- CreateIndex
CREATE INDEX "OrganizationInvite_receiverUserId_idx" ON "OrganizationInvite"("receiverUserId");

-- CreateIndex
CREATE INDEX "UserReview_targetUserId_idx" ON "UserReview"("targetUserId");

-- CreateIndex
CREATE INDEX "UserReview_authorUserId_idx" ON "UserReview"("authorUserId");

-- CreateIndex
CREATE INDEX "UserReview_authorOrganizationId_idx" ON "UserReview"("authorOrganizationId");

-- CreateIndex
CREATE INDEX "OrganizationReview_targetOrganizationId_idx" ON "OrganizationReview"("targetOrganizationId");

-- CreateIndex
CREATE INDEX "OrganizationReview_authorUserId_idx" ON "OrganizationReview"("authorUserId");

-- CreateIndex
CREATE INDEX "OrganizationReview_authorOrganizationId_idx" ON "OrganizationReview"("authorOrganizationId");

-- CreateIndex
CREATE INDEX "TaskReview_taskId_idx" ON "TaskReview"("taskId");

-- CreateIndex
CREATE INDEX "TaskReview_hostId_idx" ON "TaskReview"("hostId");

-- CreateIndex
CREATE INDEX "TaskReview_authorUserId_idx" ON "TaskReview"("authorUserId");

-- CreateIndex
CREATE INDEX "TaskReview_authorOrganizationId_idx" ON "TaskReview"("authorOrganizationId");

-- CreateIndex
CREATE INDEX "SystemReview_authorUserId_idx" ON "SystemReview"("authorUserId");

-- CreateIndex
CREATE INDEX "SystemReview_authorOrganizationId_idx" ON "SystemReview"("authorOrganizationId");

-- CreateIndex
CREATE INDEX "TaskParticipant_userId_idx" ON "TaskParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskParticipant_taskId_userId_key" ON "TaskParticipant"("taskId", "userId");

-- CreateIndex
CREATE INDEX "Donate_userId_idx" ON "Donate"("userId");

-- CreateIndex
CREATE INDEX "Donate_organizationId_idx" ON "Donate"("organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationJoinRequest" ADD CONSTRAINT "OrganizationJoinRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationJoinRequest" ADD CONSTRAINT "OrganizationJoinRequest_receiverOrganizationId_fkey" FOREIGN KEY ("receiverOrganizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvite" ADD CONSTRAINT "OrganizationInvite_senderOrganizationId_fkey" FOREIGN KEY ("senderOrganizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvite" ADD CONSTRAINT "OrganizationInvite_receiverUserId_fkey" FOREIGN KEY ("receiverUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReview" ADD CONSTRAINT "UserReview_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReview" ADD CONSTRAINT "UserReview_authorOrganizationId_fkey" FOREIGN KEY ("authorOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReview" ADD CONSTRAINT "UserReview_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationReview" ADD CONSTRAINT "OrganizationReview_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationReview" ADD CONSTRAINT "OrganizationReview_authorOrganizationId_fkey" FOREIGN KEY ("authorOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationReview" ADD CONSTRAINT "OrganizationReview_targetOrganizationId_fkey" FOREIGN KEY ("targetOrganizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskReview" ADD CONSTRAINT "TaskReview_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskReview" ADD CONSTRAINT "TaskReview_authorOrganizationId_fkey" FOREIGN KEY ("authorOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskReview" ADD CONSTRAINT "TaskReview_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskReview" ADD CONSTRAINT "TaskReview_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemReview" ADD CONSTRAINT "SystemReview_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemReview" ADD CONSTRAINT "SystemReview_authorOrganizationId_fkey" FOREIGN KEY ("authorOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskParticipant" ADD CONSTRAINT "TaskParticipant_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskParticipant" ADD CONSTRAINT "TaskParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donate" ADD CONSTRAINT "Donate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donate" ADD CONSTRAINT "Donate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
