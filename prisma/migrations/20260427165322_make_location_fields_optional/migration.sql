/*
  Warnings:

  - You are about to drop the column `paymentOptionId` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the `PaymentOption` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_UserPaymentOptions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_paymentOptionId_fkey";

-- DropForeignKey
ALTER TABLE "_UserPaymentOptions" DROP CONSTRAINT "_UserPaymentOptions_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserPaymentOptions" DROP CONSTRAINT "_UserPaymentOptions_B_fkey";

-- DropIndex
DROP INDEX "Organization_paymentOptionId_idx";

-- AlterTable
ALTER TABLE "Location" ALTER COLUMN "country" DROP NOT NULL,
ALTER COLUMN "region" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "paymentOptionId",
ADD COLUMN     "stripeCustomerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeCustomerId" TEXT;

-- DropTable
DROP TABLE "PaymentOption";

-- DropTable
DROP TABLE "_UserPaymentOptions";

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
