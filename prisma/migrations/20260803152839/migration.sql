/*
  Warnings:

  - You are about to drop the column `isRead` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `revoked` on the `RefreshToken` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `locationName` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `picture` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `banExpiresAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `banReason` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `banType` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `bannedById` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `siteRole` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `ChatMessageReaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Contact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Contact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Host` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ReadStatus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SupportMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startAt` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `UserProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `UserSettings` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_bannedById_fkey";

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ChatMessageReaction" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Host" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "isRead",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ReadStatus" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "RefreshToken" DROP COLUMN "revoked",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SupportMessage" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "location",
DROP COLUMN "locationName",
DROP COLUMN "picture",
DROP COLUMN "startDate",
DROP COLUMN "startTime",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "startAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "banExpiresAt",
DROP COLUMN "banReason",
DROP COLUMN "banType",
DROP COLUMN "bannedById",
DROP COLUMN "siteRole",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "role" "SiteRole" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "UserBan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "banType" "BlockType" NOT NULL,
    "banReason" TEXT,
    "banExpiresAt" TIMESTAMP(3),
    "bannedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UserBan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserBan_userId_key" ON "UserBan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_userId_key" ON "Contact"("userId");

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBan" ADD CONSTRAINT "UserBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBan" ADD CONSTRAINT "UserBan_bannedById_fkey" FOREIGN KEY ("bannedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
