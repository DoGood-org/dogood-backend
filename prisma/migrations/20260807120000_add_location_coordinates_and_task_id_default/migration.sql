-- AlterTable
ALTER TABLE "Location" ADD COLUMN "coordinates" JSONB;

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "id" DROP DEFAULT;
