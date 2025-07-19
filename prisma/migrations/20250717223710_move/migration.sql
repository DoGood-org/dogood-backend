/*
  Warnings:

  - You are about to drop the column `location` on the `UserSettings` table. All the data in the column will be lost.
  - You are about to drop the `_SettingsPaymentOptions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_SettingsPaymentOptions" DROP CONSTRAINT "_SettingsPaymentOptions_A_fkey";

-- DropForeignKey
ALTER TABLE "_SettingsPaymentOptions" DROP CONSTRAINT "_SettingsPaymentOptions_B_fkey";

-- AlterTable
ALTER TABLE "UserSettings" DROP COLUMN "location";

-- DropTable
DROP TABLE "_SettingsPaymentOptions";

-- CreateTable
CREATE TABLE "_UserPaymentOptions" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_UserPaymentOptions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserPaymentOptions_B_index" ON "_UserPaymentOptions"("B");

-- AddForeignKey
ALTER TABLE "_UserPaymentOptions" ADD CONSTRAINT "_UserPaymentOptions_A_fkey" FOREIGN KEY ("A") REFERENCES "PaymentOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserPaymentOptions" ADD CONSTRAINT "_UserPaymentOptions_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
