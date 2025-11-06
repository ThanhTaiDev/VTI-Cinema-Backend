-- Step 1: Create SeatStatus table
CREATE TABLE "SeatStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seatId" TEXT NOT NULL,
    "screeningId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "holdToken" TEXT,
    "holdUserId" TEXT,
    "holdUntil" DATETIME,
    "orderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeatStatus_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeatStatus_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "Screening" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeatStatus_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for SeatStatus
CREATE UNIQUE INDEX "SeatStatus_screeningId_seatId_key" ON "SeatStatus"("screeningId", "seatId");
CREATE INDEX "SeatStatus_screeningId_status_idx" ON "SeatStatus"("screeningId", "status");
CREATE INDEX "SeatStatus_holdToken_idx" ON "SeatStatus"("holdToken");

-- Step 2: Add code column to Seat (with temporary default)
ALTER TABLE "Seat" ADD COLUMN "code" TEXT;

-- Step 3: Populate code from row and col (convert row char to number)
UPDATE "Seat" SET "code" = 
    CASE 
        WHEN row = 'A' THEN 'A' || col
        WHEN row = 'B' THEN 'B' || col
        WHEN row = 'C' THEN 'C' || col
        WHEN row = 'D' THEN 'D' || col
        WHEN row = 'E' THEN 'E' || col
        WHEN row = 'F' THEN 'F' || col
        WHEN row = 'G' THEN 'G' || col
        WHEN row = 'H' THEN 'H' || col
        ELSE row || col
    END
WHERE code IS NULL;

-- Step 4: Migrate existing Seat.status to SeatStatus
INSERT INTO "SeatStatus" ("id", "seatId", "screeningId", "status", "holdToken", "holdUserId", "holdUntil", "orderId", "createdAt")
SELECT 
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))) as id,
    "Seat"."id" as "seatId",
    "Seat"."screeningId" as "screeningId",
    COALESCE("Seat"."status", 'AVAILABLE') as "status",
    "Seat"."holdToken" as "holdToken",
    "Seat"."holdUserId" as "holdUserId",
    "Seat"."holdExpiresAt" as "holdUntil",
    "Seat"."orderId" as "orderId",
    datetime('now') as "createdAt"
FROM "Seat";

-- Step 5: Convert row and col from String to Int
-- Create new table with correct types
CREATE TABLE "Seat_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "screeningId" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Seat_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "Screening" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Convert and insert data
INSERT INTO "Seat_new" ("id", "screeningId", "row", "col", "code", "createdAt", "updatedAt")
SELECT 
    "Seat"."id",
    "Seat"."screeningId",
    CASE 
        WHEN row = 'A' THEN 1
        WHEN row = 'B' THEN 2
        WHEN row = 'C' THEN 3
        WHEN row = 'D' THEN 4
        WHEN row = 'E' THEN 5
        WHEN row = 'F' THEN 6
        WHEN row = 'G' THEN 7
        WHEN row = 'H' THEN 8
        ELSE CAST(row AS INTEGER)
    END as "row",
    CAST(col AS INTEGER) as "col",
    COALESCE("Seat"."code", row || col) as "code",
    "Seat"."createdAt",
    COALESCE("Seat"."updatedAt", datetime('now'))
FROM "Seat";

-- Drop old table and rename new one
DROP TABLE "Seat";
ALTER TABLE "Seat_new" RENAME TO "Seat";

-- Recreate indexes
CREATE UNIQUE INDEX "Seat_screeningId_row_col_key" ON "Seat"("screeningId", "row", "col");
CREATE INDEX "Seat_screeningId_idx" ON "Seat"("screeningId");
