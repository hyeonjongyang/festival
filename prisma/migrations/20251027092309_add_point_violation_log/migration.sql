-- CreateTable
CREATE TABLE "PointViolation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boothId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAwardedAt" DATETIME NOT NULL,
    "availableAt" DATETIME NOT NULL,
    CONSTRAINT "PointViolation_boothId_fkey" FOREIGN KEY ("boothId") REFERENCES "Booth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PointViolation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PointViolation_detectedAt_idx" ON "PointViolation"("detectedAt");

-- CreateIndex
CREATE INDEX "PointViolation_boothId_detectedAt_idx" ON "PointViolation"("boothId", "detectedAt");

-- CreateIndex
CREATE INDEX "PointViolation_studentId_detectedAt_idx" ON "PointViolation"("studentId", "detectedAt");
