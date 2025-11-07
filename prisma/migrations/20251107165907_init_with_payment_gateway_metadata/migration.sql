-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Cinema" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "logoUrl" TEXT,
    "phone" TEXT
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "actors" TEXT,
    "director" TEXT,
    "duration" INTEGER NOT NULL,
    "genres" TEXT,
    "countries" TEXT,
    "releaseDate" DATETIME,
    "rating" REAL,
    "ageRating" TEXT,
    "description" TEXT,
    "summary" TEXT,
    "posterUrl" TEXT,
    "backdropUrl" TEXT,
    "trailerUrl" TEXT,
    "formats" TEXT,
    "cast" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMING_SOON',
    "isPreSale" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Screening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "cinemaId" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "price" INTEGER NOT NULL,
    CONSTRAINT "Screening_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Screening_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Seat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "screeningId" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Seat_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "Screening" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "screeningId" TEXT NOT NULL,
    "holdToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "seatIds" TEXT NOT NULL,
    "pricingBreakdown" TEXT,
    "totalAmount" INTEGER NOT NULL,
    "voucherCode" TEXT,
    "idempotencyKey" TEXT,
    "qrCode" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "Screening" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ticket" (
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
    CONSTRAINT "Ticket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Ticket_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "Screening" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "gateway" TEXT NOT NULL DEFAULT 'mock',
    "method" TEXT,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "net" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "status" TEXT NOT NULL,
    "providerTxId" TEXT,
    "providerOrderId" TEXT,
    "externalRef" TEXT,
    "rawPayload" TEXT,
    "webhookData" TEXT,
    "redirectUrl" TEXT,
    "source" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT,
    "gateway" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawPayload" TEXT NOT NULL,
    "signature" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL,
    "providerRefundId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentGateway" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "lockedReason" TEXT,
    "feeType" TEXT NOT NULL DEFAULT 'PERCENT',
    "feePercent" REAL,
    "feeFixed" INTEGER,
    "minFee" INTEGER,
    "maxFee" INTEGER,
    "vatOnFeePercent" REAL,
    "methodOverrides" JSONB,
    "rules" JSONB,
    "configJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "content" TEXT,
    "imageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "linkType" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_uid_key" ON "User"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_slug_key" ON "Movie"("slug");

-- CreateIndex
CREATE INDEX "Movie_status_idx" ON "Movie"("status");

-- CreateIndex
CREATE INDEX "Movie_releaseDate_idx" ON "Movie"("releaseDate");

-- CreateIndex
CREATE INDEX "Movie_isFeatured_idx" ON "Movie"("isFeatured");

-- CreateIndex
CREATE INDEX "Screening_movieId_idx" ON "Screening"("movieId");

-- CreateIndex
CREATE INDEX "Screening_cinemaId_idx" ON "Screening"("cinemaId");

-- CreateIndex
CREATE INDEX "Screening_startTime_idx" ON "Screening"("startTime");

-- CreateIndex
CREATE INDEX "Seat_screeningId_idx" ON "Seat"("screeningId");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_screeningId_row_col_key" ON "Seat"("screeningId", "row", "col");

-- CreateIndex
CREATE INDEX "SeatStatus_screeningId_seatId_idx" ON "SeatStatus"("screeningId", "seatId");

-- CreateIndex
CREATE INDEX "SeatStatus_screeningId_status_idx" ON "SeatStatus"("screeningId", "status");

-- CreateIndex
CREATE INDEX "SeatStatus_holdToken_idx" ON "SeatStatus"("holdToken");

-- CreateIndex
CREATE INDEX "SeatStatus_seatId_createdAt_idx" ON "SeatStatus"("seatId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_holdToken_key" ON "Order"("holdToken");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Order_qrCode_key" ON "Order"("qrCode");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_holdToken_idx" ON "Order"("holdToken");

-- CreateIndex
CREATE INDEX "Order_status_expiresAt_idx" ON "Order"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Order_qrCode_idx" ON "Order"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_code_key" ON "Ticket"("code");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_gateway_status_idx" ON "Payment"("gateway", "status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_providerTxId_idx" ON "Payment"("providerTxId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_method_idx" ON "Payment"("method");

-- CreateIndex
CREATE INDEX "Payment_source_idx" ON "Payment"("source");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_idempotencyKey_key" ON "WebhookEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WebhookEvent_gateway_idx" ON "WebhookEvent"("gateway");

-- CreateIndex
CREATE INDEX "WebhookEvent_receivedAt_idx" ON "WebhookEvent"("receivedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_idempotencyKey_idx" ON "WebhookEvent"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

-- CreateIndex
CREATE INDEX "Refund_idempotencyKey_idx" ON "Refund"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGateway_code_key" ON "PaymentGateway"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_isFeatured_idx" ON "Event"("isFeatured");

-- CreateIndex
CREATE INDEX "Event_startDate_idx" ON "Event"("startDate");

-- CreateIndex
CREATE INDEX "Event_endDate_idx" ON "Event"("endDate");

-- CreateIndex
CREATE INDEX "Banner_isActive_idx" ON "Banner"("isActive");

-- CreateIndex
CREATE INDEX "Banner_order_idx" ON "Banner"("order");

-- CreateIndex
CREATE INDEX "Banner_startDate_idx" ON "Banner"("startDate");

-- CreateIndex
CREATE INDEX "Banner_endDate_idx" ON "Banner"("endDate");
