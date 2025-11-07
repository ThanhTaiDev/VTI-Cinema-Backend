# Backend Setup Guide

## Environment Variables (.env)

Tạo file `.env` trong thư mục `backend/` với nội dung:

```env
# Database (SQLite for local dev)
# Use SQLite file located at backend/prisma/dev.db
DATABASE_URL="file:./prisma/dev.db"

# JWT
JWT_SECRET=your_jwt_secret

# App
PORT=4000
FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:4000

# Redis (optional, for distributed locking)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Cài đặt và chạy

### Bước 1: Cài đặt dependencies
```bash
npm install
```

### Bước 2: Generate Prisma Client
```bash
npx prisma generate
```

### Bước 3: Chạy migrations
```bash
npx prisma migrate dev
```

Hoặc nếu muốn push schema trực tiếp (không tạo migration):
```bash
npx prisma db push
```

### Bước 4: Seed data (xem phần dưới)

### Bước 5: Chạy server
```bash
npm run dev
```

## Lệnh tạo data (Seeding)

### 1. Seed đầy đủ (khuyến nghị)
Chạy script seed chính để tạo tất cả data: users, cinemas, movies, screenings, seats, events, payment gateways.

```bash
npm run seed
```

Hoặc:
```bash
node scripts/seed.js
```

**Lưu ý:** Script này sẽ xóa toàn bộ data hiện có và tạo lại từ đầu.

### 2. Seed riêng lẻ

#### Seed Payment Gateways
Chạy để tạo/cập nhật cấu hình cổng thanh toán (Mock, MoMo, VNPay, PayPal, Credit Card, v.v.):

```bash
npm run seed:gateways
```

Hoặc:
```bash
node scripts/seedPaymentGateways.js
```

#### Seed Users
Chạy để tạo users (admin và user test):

```bash
node scripts/seedUsers.js
```

### 3. Backfill data (nếu thiếu)

#### Backfill Seats
Nếu thiếu seats cho các screening:

```bash
node scripts/backfillSeats.js
```

#### Backfill Seat Status
Nếu thiếu seat status:

```bash
node scripts/backfillSeatStatus.js
```

### 4. Thông tin đăng nhập sau khi seed

**Admin:**
- Email: `admin@vticinema.com`
- Password: `admin123`

**User:**
- Email: `user@example.com`
- Password: `user123`

### 5. Thứ tự chạy đầy đủ (lần đầu setup)

```bash
# 1. Cài đặt dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Chạy migrations
npx prisma migrate dev

# 4. Seed đầy đủ data
npm run seed

# 5. (Tùy chọn) Seed lại payment gateways nếu cần
npm run seed:gateways

# 6. Chạy server
npm run dev
```

### 6. Reset và seed lại (nếu cần)

Nếu muốn reset toàn bộ database và seed lại:

```bash
# Reset database (xóa tất cả data và migrations)
npx prisma migrate reset --force

# Hoặc chỉ xóa database file (SQLite)
# Xóa file: backend/prisma/dev.db và backend/prisma/dev.db-journal

# Sau đó chạy lại migrations và seed
npx prisma migrate dev
npm run seed
```
