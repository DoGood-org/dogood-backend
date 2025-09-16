/*
  Warnings:

  - The values [MANAGER] on the enum `OrganizationRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `location` on the `Task` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Unsupported("geography")`.
  - A unique constraint covering the columns `[phoneNumber]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `description` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `moreInfo` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneNumber` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Made the column `organizationId` on table `Task` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JoinRequestDirection" AS ENUM ('FROM_USER', 'FROM_ORGANIZATION');

-- AlterEnum
BEGIN;
CREATE TYPE "OrganizationRole_new" AS ENUM ('ADMIN', 'MODERATOR', 'MEMBER');
ALTER TABLE "UserOrganization" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "UserOrganization" ALTER COLUMN "role" TYPE "OrganizationRole_new" USING ("role"::text::"OrganizationRole_new");
ALTER TYPE "OrganizationRole" RENAME TO "OrganizationRole_old";
ALTER TYPE "OrganizationRole_new" RENAME TO "OrganizationRole";
DROP TYPE "OrganizationRole_old";
ALTER TABLE "UserOrganization" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
COMMIT;

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_hostId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_organizationId_fkey";

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "moreInfo" TEXT NOT NULL,
ADD COLUMN     "phoneNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "location" SET DATA TYPE geography,
ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateTable
CREATE TABLE "JoinRequest" (
    "id" TEXT NOT NULL,
    "senderId" INTEGER NOT NULL,
    "receiverOrganizationId" TEXT,
    "receiverUserId" INTEGER,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "direction" "JoinRequestDirection" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JoinRequest_senderId_idx" ON "JoinRequest"("senderId");

-- CreateIndex
CREATE INDEX "JoinRequest_receiverOrganizationId_idx" ON "JoinRequest"("receiverOrganizationId");

-- CreateIndex
CREATE INDEX "JoinRequest_receiverUserId_idx" ON "JoinRequest"("receiverUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_phoneNumber_key" ON "Organization"("phoneNumber");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_receiverOrganizationId_fkey" FOREIGN KEY ("receiverOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_receiverUserId_fkey" FOREIGN KEY ("receiverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
