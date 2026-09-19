-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_locationId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_locationId_fkey";

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "coordinates",
DROP COLUMN "name",
ALTER COLUMN "country" SET NOT NULL,
ALTER COLUMN "country" SET DEFAULT '',
ALTER COLUMN "region" SET NOT NULL,
ALTER COLUMN "region" SET DEFAULT '',
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "city" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "locationId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "locationId";

-- CreateTable
CREATE TABLE "UserLocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskLocation" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserLocation_userId_key" ON "UserLocation"("userId");

-- CreateIndex
CREATE INDEX "UserLocation_locationId_idx" ON "UserLocation"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskLocation_taskId_key" ON "TaskLocation"("taskId");

-- CreateIndex
CREATE INDEX "TaskLocation_locationId_idx" ON "TaskLocation"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_country_region_city_key" ON "Location"("country", "region", "city");

-- AddForeignKey
ALTER TABLE "UserLocation" ADD CONSTRAINT "UserLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLocation" ADD CONSTRAINT "UserLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskLocation" ADD CONSTRAINT "TaskLocation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskLocation" ADD CONSTRAINT "TaskLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

