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

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ChatMembership" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserOrganization" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Donate" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AddCheckConstraint
-- Not expressible in schema.prisma, so Prisma neither creates nor diffs it.
ALTER TABLE "Donate" ADD CONSTRAINT "Donate_single_recipient_check"
CHECK ("userId" IS NULL OR "organizationId" IS NULL);

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
