/*
  Warnings:

  - Made the column `settings` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `avatar` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "settings" SET NOT NULL,
ALTER COLUMN "avatar" SET NOT NULL;
