/*
  Warnings:

  - You are about to alter the column `location` on the `Task` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Unsupported("geography")`.

*/
-- AlterTable
CREATE EXTENSION IF NOT EXISTS postgis;
ALTER TABLE "Task" ALTER COLUMN "location" TYPE geography 
USING ST_GeographyFromText("location");
