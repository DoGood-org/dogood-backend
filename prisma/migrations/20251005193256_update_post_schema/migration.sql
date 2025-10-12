/*
  Warnings:

  - You are about to drop the column `authorOrgId` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `targetOrgId` on the `Review` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_authorOrgId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_targetOrgId_fkey";

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "authorOrgId",
DROP COLUMN "targetOrgId",
ADD COLUMN     "authorOrganizationId" TEXT,
ADD COLUMN     "targetOrganizationId" TEXT,
ADD COLUMN     "targetPlatformId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorOrganizationId_fkey" FOREIGN KEY ("authorOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_targetOrganizationId_fkey" FOREIGN KEY ("targetOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_targetPlatformId_fkey" FOREIGN KEY ("targetPlatformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;
