-- CreateEnum
CREATE TYPE "MovieStatus" AS ENUM ('COMING_SOON', 'NOW_PLAYING', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SeatState" AS ENUM ('AVAILABLE', 'HELD', 'SOLD');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "totalSpending2025" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cinema" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "logoUrl" TEXT,
    "phone" TEXT,

    CONSTRAINT "Cinema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "actors" TEXT,
    "director" TEXT,
    "duration" INTEGER NOT NULL,
    "genres" TEXT,
    "countries" TEXT,
    "releaseDate" TIMESTAMP(3),
    "rating" DOUBLE PRECISION,
    "ageRating" TEXT,
    "description" TEXT,
    "summary" TEXT,
    "posterUrl" TEXT,
    "backdropUrl" TEXT,
    "trailerUrl" TEXT,
    "formats" TEXT,
    "cast" TEXT,
    "status" "MovieStatus" NOT NULL DEFAULT 'COMING_SOON',
    "isPreSale" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screening" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "cinemaId" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "roomId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "price" INTEGER NOT NULL,
    "basePrice" INTEGER,
    "audio" TEXT,
    "subtitle" TEXT,

    CONSTRAINT "Screening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "cinemaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rows" INTEGER NOT NULL,
    "cols" INTEGER NOT NULL,
    "seatLayout" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seat" (
    "id" TEXT NOT NULL,
    "screeningId" TEXT,
    "roomId" TEXT,
    "seatTypeId" TEXT,
    "row" TEXT,
    "col" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatHold" (
    "id" TEXT NOT NULL,
    "screeningId" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "userId" TEXT,
    "orderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'HOLD',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatStatus" (
    "id" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "screeningId" TEXT NOT NULL,
    "status" "SeatState" NOT NULL DEFAULT 'AVAILABLE',
    "holdToken" TEXT,
    "holdUserId" TEXT,
    "holdUntil" TIMESTAMP(3),
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
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
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "screeningId" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "seatRow" TEXT,
    "seatCol" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "price" INTEGER NOT NULL,
    "qrCode" TEXT,
    "checkInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
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
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "gateway" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawPayload" TEXT NOT NULL,
    "signature" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL,
    "providerRefundId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentGateway" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "lockedReason" TEXT,
    "feeType" TEXT NOT NULL DEFAULT 'PERCENT',
    "feePercent" DOUBLE PRECISION,
    "feeFixed" INTEGER,
    "minFee" INTEGER,
    "maxFee" INTEGER,
    "vatOnFeePercent" DOUBLE PRECISION,
    "methodOverrides" JSONB,
    "rules" JSONB,
    "configJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGateway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "content" TEXT,
    "imageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "EventStatus" NOT NULL DEFAULT 'ACTIVE',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "linkType" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActivity" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "value" INTEGER,
    "code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "usedOrderId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "Screening_roomId_idx" ON "Screening"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "SeatType_code_key" ON "SeatType"("code");

-- CreateIndex
CREATE INDEX "SeatType_code_idx" ON "SeatType"("code");

-- CreateIndex
CREATE INDEX "Room_cinemaId_idx" ON "Room"("cinemaId");

-- CreateIndex
CREATE INDEX "Seat_screeningId_idx" ON "Seat"("screeningId");

-- CreateIndex
CREATE INDEX "Seat_roomId_idx" ON "Seat"("roomId");

-- CreateIndex
CREATE INDEX "Seat_seatTypeId_idx" ON "Seat"("seatTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_roomId_row_col_key" ON "Seat"("roomId", "row", "col");

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

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE INDEX "Role_code_idx" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "Permission_resource_idx" ON "Permission"("resource");

-- CreateIndex
CREATE INDEX "Permission_code_idx" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "AdminActivity_actorId_idx" ON "AdminActivity"("actorId");

-- CreateIndex
CREATE INDEX "AdminActivity_resource_resourceId_idx" ON "AdminActivity"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "AdminActivity_createdAt_idx" ON "AdminActivity"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reward_code_key" ON "Reward"("code");

-- CreateIndex
CREATE INDEX "Reward_userId_idx" ON "Reward"("userId");

-- CreateIndex
CREATE INDEX "Reward_status_idx" ON "Reward"("status");

-- CreateIndex
CREATE INDEX "Reward_code_idx" ON "Reward"("code");

-- CreateIndex
CREATE INDEX "Reward_expiresAt_idx" ON "Reward"("expiresAt");

-- AddForeignKey
ALTER TABLE "Screening" ADD CONSTRAINT "Screening_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screening" ADD CONSTRAINT "Screening_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screening" ADD CONSTRAINT "Screening_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "Screening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_seatTypeId_fkey" FOREIGN KEY ("seatTypeId") REFERENCES "SeatType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatHold" ADD CONSTRAINT "SeatHold_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatHold" ADD CONSTRAINT "SeatHold_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "Screening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatHold" ADD CONSTRAINT "SeatHold_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatStatus" ADD CONSTRAINT "SeatStatus_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatStatus" ADD CONSTRAINT "SeatStatus_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "Screening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatStatus" ADD CONSTRAINT "SeatStatus_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "Screening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "Screening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActivity" ADD CONSTRAINT "AdminActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
