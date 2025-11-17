-- Drop legacy point log structures
DROP INDEX IF EXISTS "PointLog_boothId_awardedAt_idx";
DROP INDEX IF EXISTS "PointLog_studentId_awardedAt_idx";

PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS "PointLog";
PRAGMA foreign_keys=ON;

DROP INDEX IF EXISTS "PointViolation_detectedAt_idx";
DROP INDEX IF EXISTS "PointViolation_boothId_detectedAt_idx";
DROP INDEX IF EXISTS "PointViolation_studentId_detectedAt_idx";

PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS "PointViolation";
PRAGMA foreign_keys=ON;

DROP INDEX IF EXISTS "User_qrToken_key";

-- Redefine Booth to include QR token identifiers
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "qrToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booth_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booth" ("createdAt", "description", "id", "location", "name", "ownerId", "qrToken", "updatedAt")
SELECT "createdAt", "description", "id", "location", "name", "ownerId", lower(hex(randomblob(16))), "updatedAt"
FROM "Booth";
DROP TABLE "Booth";
ALTER TABLE "new_Booth" RENAME TO "Booth";
CREATE UNIQUE INDEX "Booth_ownerId_key" ON "Booth"("ownerId");
CREATE UNIQUE INDEX "Booth_qrToken_key" ON "Booth"("qrToken");

-- Redefine User to remove point totals and QR tokens
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "grade" INTEGER,
    "classNumber" INTEGER,
    "studentNumber" INTEGER,
    "code" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "nicknameLocked" BOOLEAN NOT NULL DEFAULT false,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("classNumber", "code", "createdAt", "grade", "id", "nickname", "nicknameLocked", "role", "studentNumber", "updatedAt")
SELECT "classNumber", "code", "createdAt", "grade", "id", "nickname", "nicknameLocked", "role", "studentNumber", "updatedAt"
FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_code_key" ON "User"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Create visit tracking tables
CREATE TABLE "BoothVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boothId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "visitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BoothVisit_boothId_fkey" FOREIGN KEY ("boothId") REFERENCES "Booth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BoothVisit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "VisitViolation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boothId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVisitedAt" DATETIME NOT NULL,
    "availableAt" DATETIME NOT NULL,
    CONSTRAINT "VisitViolation_boothId_fkey" FOREIGN KEY ("boothId") REFERENCES "Booth" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VisitViolation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Recreate supporting indexes
CREATE INDEX "BoothVisit_studentId_visitedAt_idx" ON "BoothVisit"("studentId", "visitedAt");
CREATE INDEX "BoothVisit_boothId_visitedAt_idx" ON "BoothVisit"("boothId", "visitedAt");
CREATE INDEX "VisitViolation_detectedAt_idx" ON "VisitViolation"("detectedAt");
CREATE INDEX "VisitViolation_boothId_detectedAt_idx" ON "VisitViolation"("boothId", "detectedAt");
CREATE INDEX "VisitViolation_studentId_detectedAt_idx" ON "VisitViolation"("studentId", "detectedAt");
