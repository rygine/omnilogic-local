-- CreateTable
CREATE TABLE "stored_settings" (
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "json" TEXT NOT NULL,
    "readAt" TEXT NOT NULL,

    PRIMARY KEY ("host", "port", "key")
);
