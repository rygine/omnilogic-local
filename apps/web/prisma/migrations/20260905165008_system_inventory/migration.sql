-- CreateTable
CREATE TABLE "system_inventory" (
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "firmwareVersion" TEXT,
    "json" TEXT NOT NULL,
    "readAt" TEXT NOT NULL,

    PRIMARY KEY ("host", "port")
);
