-- CreateTable
CREATE TABLE "SeatHold" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "screeningId" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "userId" TEXT,
    "orderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'HOLD',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SeatHold_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeatHold_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "Screening" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeatHold_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SeatHold_screeningId_seatId_idx" ON "SeatHold"("screeningId", "seatId");

-- CreateIndex
CREATE INDEX "SeatHold_screeningId_status_idx" ON "SeatHold"("screeningId", "status");

-- CreateIndex
CREATE INDEX "SeatHold_userId_idx" ON "SeatHold"("userId");

-- CreateIndex
CREATE INDEX "SeatHold_orderId_idx" ON "SeatHold"("orderId");

-- CreateIndex
CREATE INDEX "SeatHold_expiresAt_idx" ON "SeatHold"("expiresAt");

-- CreateIndex
CREATE INDEX "SeatHold_status_expiresAt_idx" ON "SeatHold"("status", "expiresAt");
