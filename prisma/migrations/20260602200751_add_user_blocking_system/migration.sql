-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BANNED');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('THREE_DAYS', 'ONE_WEEK', 'ONE_MONTH', 'CUSTOM', 'PERMANENT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "banExpiresAt" TIMESTAMP(3),
ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "banType" "BlockType",
ADD COLUMN     "bannedById" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_bannedById_fkey" FOREIGN KEY ("bannedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
