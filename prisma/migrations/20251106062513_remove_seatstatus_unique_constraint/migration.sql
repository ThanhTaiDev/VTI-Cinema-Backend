/*
  Warnings:

  - You are about to alter the column `seatCol` on the `Ticket` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `seatRow` on the `Ticket` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- DropIndex
DROP INDEX "SeatStatus_screeningId_seatId_key";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "screeningId" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "seatRow" INTEGER NOT NULL,
    "seatCol" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "price" INTEGER NOT NULL,
    "qrCode" TEXT,
    "checkInAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ticket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Ticket" ("checkInAt", "code", "createdAt", "id", "orderId", "price", "qrCode", "screeningId", "seatCol", "seatId", "seatRow", "status", "userId") SELECT "checkInAt", "code", "createdAt", "id", "orderId", "price", "qrCode", "screeningId", "seatCol", "seatId", "seatRow", "status", "userId" FROM "Ticket";
DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";
CREATE UNIQUE INDEX "Ticket_code_key" ON "Ticket"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SeatStatus_screeningId_seatId_idx" ON "SeatStatus"("screeningId", "seatId");

-- CreateIndex
CREATE INDEX "SeatStatus_seatId_createdAt_idx" ON "SeatStatus"("seatId", "createdAt");
