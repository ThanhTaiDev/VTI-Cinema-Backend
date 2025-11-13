-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Seat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "screeningId" TEXT,
    "roomId" TEXT,
    "seatTypeId" TEXT,
    "row" TEXT,
    "col" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Seat_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "Screening" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Seat_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Seat_seatTypeId_fkey" FOREIGN KEY ("seatTypeId") REFERENCES "SeatType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Seat" ("code", "col", "createdAt", "id", "roomId", "row", "screeningId", "seatTypeId", "status", "updatedAt") SELECT "code", "col", "createdAt", "id", "roomId", "row", "screeningId", "seatTypeId", "status", "updatedAt" FROM "Seat";
DROP TABLE "Seat";
ALTER TABLE "new_Seat" RENAME TO "Seat";
CREATE INDEX "Seat_screeningId_idx" ON "Seat"("screeningId");
CREATE INDEX "Seat_roomId_idx" ON "Seat"("roomId");
CREATE INDEX "Seat_seatTypeId_idx" ON "Seat"("seatTypeId");
CREATE UNIQUE INDEX "Seat_roomId_row_col_key" ON "Seat"("roomId", "row", "col");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
