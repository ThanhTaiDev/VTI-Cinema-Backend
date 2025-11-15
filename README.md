# VTI Cinema - Backend API

Hệ thống quản lý rạp chiếu phim với đầy đủ chức năng từ quản lý phim, vé, suất chiếu đến thanh toán và thống kê.

## 📋 Mục lục

- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt](#cài-đặt)
- [Cấu hình](#cấu-hình)
- [Chạy dự án](#chạy-dự-án)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [API Documentation](#api-documentation)
- [Database](#database)
- [Authentication & Authorization](#authentication--authorization)
- [Các chức năng chính](#các-chức-năng-chính)

## 🖥️ Yêu cầu hệ thống

- Node.js >= 18.x
- npm hoặc yarn
- SQLite (hoặc PostgreSQL/MySQL nếu cấu hình)
- Redis (tùy chọn, cho rate limiting và caching)

## 📦 Cài đặt

### 1. Clone repository và cài đặt dependencies

```bash
cd Backend_WebsiteXemPhim
npm install
```

### 2. Cấu hình môi trường

Tạo file `.env` trong thư mục root với nội dung:

```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# JWT Secret
JWT_SECRET="your-secret-key-here-change-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV=development

# Redis (tùy chọn)
REDIS_HOST=localhost
REDIS_PORT=6379

# Payment Gateways (tùy chọn)
VNPAY_TMN_CODE=your-tmn-code
VNPAY_SECRET_KEY=your-secret-key
MOMO_PARTNER_CODE=your-partner-code
MOMO_ACCESS_KEY=your-access-key
MOMO_SECRET_KEY=your-secret-key
```

### 3. Setup Database

```bash
# Chạy migrations
npm run migrate

# Seed dữ liệu mẫu (tùy chọn)
npm run seed

# Seed payment gateways
npm run seed:gateways
```

## 🚀 Chạy dự án

### Development mode

```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:3000`

### Production mode

```bash
npm start
```

## 📁 Cấu trúc dự án

```
Backend_WebsiteXemPhim/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── config/               # Cấu hình (database, permissions)
│   ├── controllers/          # Request handlers
│   ├── services/             # Business logic
│   ├── routes/               # API routes
│   ├── middlewares/          # Middleware (auth, validation, rate limit)
│   ├── gateways/             # Payment gateway integrations
│   ├── jobs/                 # Background jobs
│   ├── utils/                # Utility functions
│   └── server.js             # Entry point
├── scripts/                  # Utility scripts
└── package.json
```

## 🔌 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Authentication

Hầu hết các API yêu cầu authentication. Gửi token trong header:

```
Authorization: Bearer <token>
```

### Các nhóm API chính

#### 1. Authentication (`/api/auth`)
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/forgot-password` - Quên mật khẩu
- `GET /api/auth/me` - Lấy thông tin user hiện tại

#### 2. Movies (`/api/movies`)
- `GET /api/movies` - Danh sách phim
- `GET /api/movies/:id` - Chi tiết phim
- `POST /api/admin/movies` - Tạo phim (Admin)
- `PUT /api/admin/movies/:id` - Cập nhật phim (Admin)
- `DELETE /api/admin/movies/:id` - Xóa phim (Admin)

#### 3. Cinemas (`/api/cinemas`)
- `GET /api/cinemas` - Danh sách rạp
- `GET /api/cinemas/:id` - Chi tiết rạp
- `POST /api/admin/cinemas` - Tạo rạp (Admin)
- `PUT /api/admin/cinemas/:id` - Cập nhật rạp (Admin)
- `DELETE /api/admin/cinemas/:id` - Xóa rạp (Admin)

#### 4. Screenings (`/api/screenings`)
- `GET /api/screenings` - Danh sách suất chiếu
- `GET /api/screenings/:id` - Chi tiết suất chiếu
- `GET /api/screenings/:id/seats` - Lấy sơ đồ ghế
- `POST /api/admin/screenings` - Tạo suất chiếu (Admin)
- `PUT /api/admin/screenings/:id` - Cập nhật suất chiếu (Admin)
- `DELETE /api/admin/screenings/:id` - Xóa suất chiếu (Admin)

#### 5. Tickets (`/api/tickets`)
- `GET /api/tickets` - Danh sách vé (có filter)
- `GET /api/tickets/:id` - Chi tiết vé
- `POST /api/tickets` - Tạo vé (booking)
- `PUT /api/tickets/:id` - Cập nhật vé
- `DELETE /api/tickets/:id` - Hủy vé

#### 6. Orders (`/api/orders`)
- `GET /api/orders` - Danh sách đơn hàng
- `GET /api/orders/:id` - Chi tiết đơn hàng
- `POST /api/orders` - Tạo đơn hàng
- `PUT /api/orders/:id` - Cập nhật đơn hàng

#### 7. Payments (`/api/payments`)
- `GET /api/payments` - Danh sách thanh toán
- `GET /api/payments/:id` - Chi tiết thanh toán
- `POST /api/payments` - Tạo thanh toán
- `POST /api/payments/:id/refund` - Hoàn tiền
- `POST /api/payments/:id/webhook` - Webhook từ gateway

#### 8. Revenue (`/api/revenue`)
- `GET /api/admin/revenue/stats` - Thống kê doanh thu
- `GET /api/admin/revenue/by-cinema` - Doanh thu theo rạp
- `GET /api/admin/revenue/top-movies` - Top phim theo doanh thu

#### 9. Dashboard (`/api/admin/dashboard`)
- `GET /api/admin/dashboard/summary` - Tổng quan dashboard
- `GET /api/admin/dashboard/revenue-chart` - Biểu đồ doanh thu
- `GET /api/admin/dashboard/tickets-chart` - Biểu đồ vé

#### 10. Admin - Rooms (`/api/admin/rooms`)
- `GET /api/admin/rooms` - Danh sách phòng chiếu
- `GET /api/admin/rooms/:id` - Chi tiết phòng
- `POST /api/admin/rooms` - Tạo phòng (Admin)
- `PUT /api/admin/rooms/:id` - Cập nhật phòng (Admin)
- `DELETE /api/admin/rooms/:id` - Xóa phòng (Admin)
- `GET /api/admin/rooms/:roomId/seats` - Lấy ghế của phòng
- `POST /api/admin/rooms/:roomId/seats` - Lưu ghế của phòng
- `DELETE /api/admin/rooms/:roomId/seats` - Xóa ghế của phòng

#### 11. Admin - Accounts (`/api/admin/accounts`)
- `GET /api/admin/accounts` - Danh sách tài khoản
- `GET /api/admin/accounts/:id` - Chi tiết tài khoản
- `POST /api/admin/accounts` - Tạo tài khoản (Admin)
- `PUT /api/admin/accounts/:id` - Cập nhật tài khoản (Admin)
- `DELETE /api/admin/accounts/:id` - Xóa tài khoản (Admin)

#### 12. RBAC (`/api/admin/rbac`)
- `GET /api/admin/rbac/roles` - Danh sách roles
- `POST /api/admin/rbac/roles` - Tạo role
- `PUT /api/admin/rbac/roles/:id` - Cập nhật role
- `GET /api/admin/rbac/permissions` - Danh sách permissions
- `POST /api/admin/rbac/users/:userId/roles` - Gán role cho user

## 🗄️ Database

### Schema chính

- **User**: Người dùng (user, admin)
- **Cinema**: Rạp chiếu phim
- **Room**: Phòng chiếu
- **Seat**: Ghế ngồi
- **Movie**: Phim
- **Screening**: Suất chiếu
- **Ticket**: Vé
- **Order**: Đơn hàng
- **Payment**: Thanh toán
- **Review**: Đánh giá phim
- **Event/Promotion**: Tin khuyến mãi
- **Banner**: Banner quảng cáo
- **Role**: Vai trò (RBAC)
- **Permission**: Quyền (RBAC)
- **UserRole**: Gán role cho user

### Migrations

```bash
# Tạo migration mới
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (xóa tất cả data)
npx prisma migrate reset
```

### Prisma Studio

Xem và chỉnh sửa database trực quan:

```bash
npx prisma studio
```

## 🔐 Authentication & Authorization

### Authentication

Sử dụng JWT (JSON Web Token). Sau khi login, nhận token và gửi trong header:

```
Authorization: Bearer <token>
```

### Authorization (RBAC)

Hệ thống sử dụng Role-Based Access Control (RBAC):

- **Roles**: Vai trò (Admin, Manager, Staff, User)
- **Permissions**: Quyền cụ thể (MOVIES_VIEW, MOVIES_CREATE, etc.)
- **UserRole**: Gán role cho user

Các permissions chính:
- `MOVIES_*`: Quản lý phim
- `CINEMAS_*`: Quản lý rạp
- `SCREENINGS_*`: Quản lý suất chiếu
- `TICKETS_*`: Quản lý vé
- `ORDERS_*`: Quản lý đơn hàng
- `PAYMENTS_*`: Quản lý thanh toán
- `USERS_*`: Quản lý tài khoản
- `REVENUE_VIEW`: Xem doanh thu

## 🎯 Các chức năng chính

### 1. Quản lý Phim
- CRUD phim
- Upload poster, trailer
- Quản lý trạng thái (COMING_SOON, NOW_PLAYING, ARCHIVED)
- Thống kê phim (doanh thu, vé bán, đánh giá)

### 2. Quản lý Rạp & Phòng chiếu
- CRUD rạp chiếu phim
- CRUD phòng chiếu
- Quản lý ghế ngồi (STANDARD, VIP, COUPLE, UNAVAILABLE)
- Sơ đồ ghế trực quan

### 3. Quản lý Suất chiếu
- Tạo suất chiếu (phim, rạp, phòng, thời gian)
- Quản lý giá vé
- Kiểm tra trùng lịch

### 4. Booking & Thanh toán
- Đặt vé online
- Chọn ghế
- Thanh toán qua nhiều gateway:
  - VNPay
  - MoMo
  - ZaloPay
  - ShopeePay
  - Napas QR
  - PayPal
  - Credit Card (Mock)
- Hoàn tiền

### 5. Quản lý Vé
- Xem danh sách vé
- Hủy vé
- Hoàn tiền vé
- Thống kê vé (theo ngày, phim, rạp, trạng thái)

### 6. Thống kê & Báo cáo
- Dashboard tổng quan
- Thống kê doanh thu
- Thống kê phim
- Thống kê rạp
- Thống kê vé
- Thống kê suất chiếu
- Thống kê tin khuyến mãi

### 7. Quản lý Tài khoản
- CRUD user
- Phân quyền (RBAC)
- Gán role
- Quản lý permissions

### 8. Quản lý Tin khuyến mãi
- CRUD tin khuyến mãi
- Upload hình ảnh
- Quản lý trạng thái
- Thống kê lượt xem

### 9. Quản lý Banner
- CRUD banner
- Upload hình ảnh
- Quản lý vị trí hiển thị

### 10. Đánh giá & Review
- User đánh giá phim
- Xem danh sách review
- Tính điểm trung bình

## 🛠️ Scripts hữu ích

```bash
# Seed dữ liệu mẫu
npm run seed

# Seed payment gateways
npm run seed:gateways

# Seed RBAC (roles & permissions)
node scripts/seedRBAC.js

# Seed admin activity
node scripts/seedAdminActivity.js

# List users
node scripts/listUsers.js

# Delete user
node scripts/deleteUser.js
```

## 🔒 Security

- JWT authentication
- Password hashing (bcrypt)
- Rate limiting (express-rate-limit)
- Input validation
- SQL injection protection (Prisma)
- CORS configuration

## 📝 Notes

- Database mặc định: SQLite (file: `prisma/dev.db`)
- Có thể chuyển sang PostgreSQL/MySQL bằng cách thay đổi `DATABASE_URL` trong `.env`
- Redis được sử dụng cho rate limiting và caching (tùy chọn)
- Background jobs: cleanup expired holds, payments, tickets

## 🐛 Troubleshooting

### Lỗi database connection
- Kiểm tra `DATABASE_URL` trong `.env`
- Chạy `npm run migrate` để tạo database

### Lỗi JWT
- Kiểm tra `JWT_SECRET` trong `.env`
- Đảm bảo token được gửi đúng format trong header

### Lỗi payment gateway
- Kiểm tra cấu hình gateway trong `.env`
- Xem logs trong console để debug

## 🚀 Deploy lên Vercel

Xem hướng dẫn chi tiết trong file [../DEPLOY_VERCEL.md](../DEPLOY_VERCEL.md)

### Tóm tắt:

1. Chuyển database từ SQLite sang PostgreSQL
2. Cập nhật `prisma/schema.prisma` (đổi provider thành `postgresql`)
3. Deploy: `vercel`
4. Cấu hình environment variables trong Vercel Dashboard
5. Chạy migrations: `npx prisma migrate deploy`

⚠️ **Lưu ý**: 
- SQLite không hoạt động trên Vercel (filesystem read-only)
- Background jobs cần sử dụng Vercel Cron Jobs (đã cấu hình trong `vercel.json`)

## 📞 Support

Nếu gặp vấn đề, vui lòng kiểm tra:
1. Logs trong console
2. Database connection
3. Environment variables
4. API documentation
5. [DEPLOY_VERCEL.md](../DEPLOY_VERCEL.md) cho hướng dẫn deploy

---

**Version**: 1.0.0  
**Last Updated**: 2025

