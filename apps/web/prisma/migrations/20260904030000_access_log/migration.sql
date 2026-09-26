-- The table is a controller access log and nothing else, so the columns of
-- a general-purpose log go: every row had namespace "controller", one of two
-- messages, and a level that only ever restated `ok`. The access columns
-- become required — every row already has them.

-- DropIndex
DROP INDEX "logs_namespace_idx";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "time" TEXT NOT NULL,
    "op" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "errors" TEXT,
    "requestId" TEXT
);
INSERT INTO "new_logs" ("id", "time", "op", "ok", "durationMs", "errors", "requestId")
SELECT "id", "time", "op", "ok", "durationMs", "errors", "requestId"
FROM "logs"
WHERE "op" IS NOT NULL AND "ok" IS NOT NULL AND "durationMs" IS NOT NULL;
DROP TABLE "logs";
ALTER TABLE "new_logs" RENAME TO "logs";
CREATE INDEX "logs_time_idx" ON "logs"("time");
CREATE INDEX "logs_requestId_idx" ON "logs"("requestId");
CREATE INDEX "logs_op_idx" ON "logs"("op");
CREATE INDEX "logs_durationMs_idx" ON "logs"("durationMs");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
