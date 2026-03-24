ALTER TABLE "Task"
ALTER COLUMN "id" SET DEFAULT (gen_random_uuid())::text;