-- Every record is a controller access: the operation, how long it took and
-- whether it worked become columns, and the JSON bag they used to live in
-- goes away. Rows written before this carry the same facts inside `fields`
-- (every value stored as a string); lift them out first. The controller's
-- host and port used to be logged too — the same on every row — and the
-- error message duplicated the `errors` column; neither is kept.

-- AlterTable
ALTER TABLE "logs" ADD COLUMN "durationMs" INTEGER;
ALTER TABLE "logs" ADD COLUMN "ok" BOOLEAN;
ALTER TABLE "logs" ADD COLUMN "op" TEXT;

-- Backfill
UPDATE "logs"
SET
  "op" = json_extract("fields", '$.op'),
  "ok" = CASE json_extract("fields", '$.ok')
    WHEN 'true' THEN 1
    WHEN 'false' THEN 0
    ELSE NULL
  END,
  "durationMs" = CAST(json_extract("fields", '$.durationMs') AS INTEGER)
WHERE "fields" IS NOT NULL AND json_valid("fields");

-- DropColumn
ALTER TABLE "logs" DROP COLUMN "fields";

-- CreateIndex
CREATE INDEX "logs_op_idx" ON "logs"("op");
