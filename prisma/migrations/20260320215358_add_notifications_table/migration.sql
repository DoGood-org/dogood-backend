-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('TASK', 'ORGANIZATION', 'REVIEW', 'USER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORG_JOIN_REQUEST_RECEIVED', 'ORG_JOIN_REQUEST_ACCEPTED', 'ORG_JOIN_REQUEST_REJECTED', 'ORG_MEMBER_REMOVED', 'ORG_ROLE_UPDATED', 'ORG_NEW_MODERATOR', 'TASK_VALIDATED', 'TASK_REJECTED', 'TASK_STARTING_SOON', 'TASK_COMPLETED', 'TASK_CLOSED', 'REVIEW_RECEIVED', 'REVIEW_APPROVED', 'REVIEW_REJECTED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "relatedId" TEXT,
    "entityType" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
