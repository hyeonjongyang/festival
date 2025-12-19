-- CreateTable
CREATE TABLE "AdminDbSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordCount" INTEGER NOT NULL,
    "data" JSONB NOT NULL
);

-- CreateIndex
CREATE INDEX "AdminDbSnapshot_tableKey_createdAt_idx" ON "AdminDbSnapshot"("tableKey", "createdAt");
