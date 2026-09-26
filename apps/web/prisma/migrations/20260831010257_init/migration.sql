-- CreateTable
CREATE TABLE "logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "time" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "fields" TEXT,
    "errors" TEXT,
    "requestId" TEXT
);

-- CreateIndex
CREATE INDEX "logs_time_idx" ON "logs"("time");

-- CreateIndex
CREATE INDEX "logs_namespace_idx" ON "logs"("namespace");

-- CreateIndex
CREATE INDEX "logs_requestId_idx" ON "logs"("requestId");
