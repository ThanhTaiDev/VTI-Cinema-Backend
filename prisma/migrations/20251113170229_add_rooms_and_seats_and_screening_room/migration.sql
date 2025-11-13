/*
  Warnings:

  - Added the required column `roomId` to the `Seat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seatTypeId` to the `Seat` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "SeatType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceFactor" REAL NOT NULL DEFAULT 1.0,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cinemaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rows" INTEGER NOT NULL,
    "cols" INTEGER NOT NULL,
    "seatLayout" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Room_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Screening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "cinemaId" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "roomId" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "price" INTEGER NOT NULL,
    "basePrice" INTEGER,
    "audio" TEXT,
    "subtitle" TEXT,
    CONSTRAINT "Screening_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Screening_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Screening_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Screening" ("cinemaId", "endTime", "id", "movieId", "price", "room", "startTime") SELECT "cinemaId", "endTime", "id", "movieId", "price", "room", "startTime" FROM "Screening";
DROP TABLE "Screening";
ALTER TABLE "new_Screening" RENAME TO "Screening";
CREATE INDEX "Screening_movieId_idx" ON "Screening"("movieId");
CREATE INDEX "Screening_cinemaId_idx" ON "Screening"("cinemaId");
CREATE INDEX "Screening_startTime_idx" ON "Screening"("startTime");
CREATE INDEX "Screening_roomId_idx" ON "Screening"("roomId");
CREATE TABLE "new_Seat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "screeningId" TEXT,
    "roomId" TEXT NOT NULL,
    "seatTypeId" TEXT NOT NULL,
    "row" TEXT NOT NULL,
    "col" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Seat_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "Screening" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Seat_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Seat_seatTypeId_fkey" FOREIGN KEY ("seatTypeId") REFERENCES "SeatType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Seat" ("code", "col", "createdAt", "id", "row", "screeningId", "updatedAt") SELECT "code", "col", "createdAt", "id", "row", "screeningId", "updatedAt" FROM "Seat";
DROP TABLE "Seat";
ALTER TABLE "new_Seat" RENAME TO "Seat";
CREATE INDEX "Seat_screeningId_idx" ON "Seat"("screeningId");
CREATE INDEX "Seat_roomId_idx" ON "Seat"("roomId");
CREATE INDEX "Seat_seatTypeId_idx" ON "Seat"("seatTypeId");
CREATE UNIQUE INDEX "Seat_roomId_row_col_key" ON "Seat"("roomId", "row", "col");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SeatType_code_key" ON "SeatType"("code");

-- CreateIndex
CREATE INDEX "SeatType_code_idx" ON "SeatType"("code");

-- CreateIndex
CREATE INDEX "Room_cinemaId_idx" ON "Room"("cinemaId");
