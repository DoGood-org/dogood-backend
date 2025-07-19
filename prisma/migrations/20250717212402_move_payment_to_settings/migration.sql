/*
  Warnings:

  - You are about to drop the `_UserPaymentOptions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_UserPaymentOptions" DROP CONSTRAINT "_UserPaymentOptions_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserPaymentOptions" DROP CONSTRAINT "_UserPaymentOptions_B_fkey";

-- DropTable
DROP TABLE "_UserPaymentOptions";

-- CreateTable
CREATE TABLE "_SettingsPaymentOptions" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_SettingsPaymentOptions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_SettingsPaymentOptions_B_index" ON "_SettingsPaymentOptions"("B");

-- AddForeignKey
ALTER TABLE "_SettingsPaymentOptions" ADD CONSTRAINT "_SettingsPaymentOptions_A_fkey" FOREIGN KEY ("A") REFERENCES "PaymentOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SettingsPaymentOptions" ADD CONSTRAINT "_SettingsPaymentOptions_B_fkey" FOREIGN KEY ("B") REFERENCES "UserSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
