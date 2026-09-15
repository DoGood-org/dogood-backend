-- Location becomes a create-only country/region/city reference; point data moves to per-owner tables.
-- Step order matters: owner rows are copied from each owner's ORIGINAL Location row before duplicates are removed.

-- 1. Owner location tables (indexes and foreign keys are added after the data is moved)
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

-- 2. Address fields: NULL -> '' (NULLs are never equal in a unique index), trimmed
UPDATE "Location"
SET "country" = trim(coalesce("country", '')),
    "region" = trim(coalesce("region", '')),
    "city" = trim(coalesce("city", ''));

-- 3. Map every row to the oldest row of its (country, region, city) group
CREATE TEMP TABLE "_LocationSurvivor" AS
SELECT
    "id",
    first_value("id") OVER (PARTITION BY "country", "region", "city" ORDER BY "createdAt", "id") AS "survivorId",
    ("country" = '' AND "region" = '' AND "city" = '') AS "isEmpty"
FROM "Location";

-- 4. Owner rows: name and coordinates of the owner's original row, locationId of the surviving row.
--    Non-numeric JSON coordinates become NULL instead of failing the migration.
INSERT INTO "UserLocation" ("id", "userId", "locationId", "name", "latitude", "longitude", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    u."id",
    s."survivorId",
    l."name",
    CASE WHEN jsonb_typeof(l."coordinates" -> 'lat') = 'number' THEN (l."coordinates" ->> 'lat')::double precision END,
    CASE WHEN jsonb_typeof(l."coordinates" -> 'lng') = 'number' THEN (l."coordinates" ->> 'lng')::double precision END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User" u
JOIN "Location" l ON l."id" = u."locationId"
JOIN "_LocationSurvivor" s ON s."id" = l."id"
WHERE NOT s."isEmpty";

INSERT INTO "TaskLocation" ("id", "taskId", "locationId", "name", "latitude", "longitude", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    t."id",
    s."survivorId",
    l."name",
    CASE WHEN jsonb_typeof(l."coordinates" -> 'lat') = 'number' THEN (l."coordinates" ->> 'lat')::double precision END,
    CASE WHEN jsonb_typeof(l."coordinates" -> 'lng') = 'number' THEN (l."coordinates" ->> 'lng')::double precision END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Task" t
JOIN "Location" l ON l."id" = t."locationId"
JOIN "_LocationSurvivor" s ON s."id" = l."id"
WHERE NOT s."isEmpty";

UPDATE "Organization" o
SET "locationId" = CASE WHEN s."isEmpty" THEN NULL ELSE s."survivorId" END
FROM "_LocationSurvivor" s
WHERE s."id" = o."locationId";

-- 5. Old owner references
ALTER TABLE "Task" DROP CONSTRAINT "Task_locationId_fkey";
ALTER TABLE "User" DROP CONSTRAINT "User_locationId_fkey";
ALTER TABLE "Task" DROP COLUMN "locationId";
ALTER TABLE "User" DROP COLUMN "locationId";

-- 6. Duplicate and empty Location rows
DELETE FROM "Location" l
USING "_LocationSurvivor" s
WHERE s."id" = l."id"
  AND (s."isEmpty" OR s."id" <> s."survivorId");

DROP TABLE "_LocationSurvivor";

-- 7. Final Location shape, indexes and foreign keys
ALTER TABLE "Location" DROP COLUMN "coordinates",
DROP COLUMN "name",
ALTER COLUMN "country" SET NOT NULL,
ALTER COLUMN "country" SET DEFAULT '',
ALTER COLUMN "region" SET NOT NULL,
ALTER COLUMN "region" SET DEFAULT '',
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "city" SET DEFAULT '';

CREATE UNIQUE INDEX "Location_country_region_city_key" ON "Location"("country", "region", "city");

CREATE UNIQUE INDEX "UserLocation_userId_key" ON "UserLocation"("userId");

CREATE INDEX "UserLocation_locationId_idx" ON "UserLocation"("locationId");

CREATE UNIQUE INDEX "TaskLocation_taskId_key" ON "TaskLocation"("taskId");

CREATE INDEX "TaskLocation_locationId_idx" ON "TaskLocation"("locationId");

ALTER TABLE "UserLocation" ADD CONSTRAINT "UserLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserLocation" ADD CONSTRAINT "UserLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TaskLocation" ADD CONSTRAINT "TaskLocation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskLocation" ADD CONSTRAINT "TaskLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
