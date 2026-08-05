/*
  Warnings:

  - You are about to drop the column `startAt` on the `Task` table. All the data in the column will be lost.
  - Added the required column `startDate` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Task" DROP COLUMN "startAt",
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;
