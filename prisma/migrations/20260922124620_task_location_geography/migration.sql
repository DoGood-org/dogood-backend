-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- AlterTable
-- "geo" is derived by Postgres from latitude/longitude, which stay the only source of truth.
-- No dual-write and no trigger: a STORED generated column is recomputed on every insert/update.
ALTER TABLE "TaskLocation" ADD COLUMN "geo" geography(Point, 4326) GENERATED ALWAYS AS (
    CASE
        WHEN "latitude" IS NOT NULL AND "longitude" IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
    END
) STORED;

-- CreateIndex
CREATE INDEX "TaskLocation_geo_idx" ON "TaskLocation" USING GIST ("geo");
