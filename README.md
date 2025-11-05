# BACKEND - HỆ THỐNG QUẢN LÝ RẠP CHIẾU PHIM

## 📋 MÔ TẢ

Backend của hệ thống quản lý rạp chiếu phim được xây dựng bằng **Node.js** + **Express 5**, sử dụng **Prisma ORM** với **SQLite** database. Hệ thống cung cấp RESTful API cho việc quản lý phim, rạp, suất chiếu, vé, thanh toán, đánh giá và các chức năng quản trị.

## 🚀 CÀI ĐẶT VÀ CHẠY

### Yêu cầu
- Node.js >= 18.0.0
- npm hoặc yarn

### Cài đặt

```bash
cd backend
npm install
```

### Database Setup

```bash
# Tạo database và chạy migrations
npm run migrate

# Seed dữ liệu (tạo admin user)
npm run seed
```

### Chạy Development Server

```bash
npm run dev
```

Server sẽ chạy tại: `http://localhost:4000`

### Chạy Production

```bash
npm start
```

## 📁 CẤU TRÚC THƯ MỤC

```
backend/
├── src/
│   ├── config/             # Cấu hình
│   │   └── database.js     # Database configuration
│   ├── controllers/        # Controllers xử lý HTTP requests
│   │   ├── authController.js
│   │   ├── movieController.js
│   │   ├── cinemaController.js
│   │   ├── screeningController.js
│   │   ├── ticketController.js
│   │   ├── userController.js
│   │   ├── reviewController.js
│   │   ├── paymentController.js
│   │   └── revenueController.js
│   ├── middlewares/        # Middleware functions
│   │   └── auth.js         # Authentication & Authorization middleware
│   ├── routes/             # API routes
│   │   ├── auth.js
│   │   ├── movies.js
│   │   ├── cinemas.js
│   │   ├── screenings.js
│   │   ├── tickets.js
│   │   ├── users.js
│   │   ├── reviews.js
│   │   ├── payments.js
│   │   └── revenue.js
│   ├── services/           # Business logic
│   │   ├── authService.js
│   │   ├── movieService.js
│   │   ├── cinemaService.js
│   │   ├── screeningService.js
│   │   ├── ticketService.js
│   │   ├── userService.js
│   │   ├── reviewService.js
│   │   ├── paymentService.js
│   │   └── revenueService.js
│   ├── utils/              # Utility functions
│   ├── prismaClient.js     # Prisma client instance
│   └── server.js           # Express server entry point
├── prisma/
│   └── schema.prisma       # Prisma schema definition
├── scripts/
│   └── seed.js             # Database seeding script
├── .env                    # Environment variables
├── package.json
└── README.md
```

## 🗄️ DATABASE MODELS

### User (Người dùng)
- `id`: String (CUID)
- `uid`: String (UUID, unique)
- `name`: String
- `email`: String (unique)
- `phone`: String (optional)
- `password`: String (hashed)
- `role`: String (default: "USER") - "USER" hoặc "ADMIN"
- `status`: String (default: "ACTIVE") - "ACTIVE" hoặc "INACTIVE"
- `createdAt`: DateTime

### Movie (Phim)
- `id`: String (CUID)
- `title`: String
- `actors`: String (optional)
- `duration`: Int (phút)
- `genres`: String (optional)
- `releaseDate`: DateTime (optional)
- `rating`: Float (optional)
- `description`: String (optional)
- `posterUrl`: String (optional)

### Cinema (Rạp phim)
- `id`: String (CUID)
- `name`: String
- `region`: String
- `address`: String
- `latitude`: Float (optional)
- `longitude`: Float (optional)
- `logoUrl`: String (optional)
- `phone`: String (optional)

### Screening (Suất chiếu)
- `id`: String (CUID)
- `movieId`: String
- `cinemaId`: String
- `room`: String
- `startTime`: DateTime
- `endTime`: DateTime
- `price`: Int (VNĐ)

### Ticket (Vé)
- `id`: String (CUID)
- `code`: String (UUID, unique)
- `screeningId`: String
- `seatRow`: String
- `seatCol`: String
- `userId`: String
- `status`: String (default: "PENDING") - "PENDING", "SUCCESS", "LOCKED", "CANCELED"
- `price`: Int (VNĐ)
- `createdAt`: DateTime

### Review (Đánh giá)
- `id`: String (CUID)
- `movieId`: String
- `userId`: String
- `rating`: Int (1-10)
- `content`: String (optional)
- `tags`: String (optional)
- `createdAt`: DateTime

### Payment (Thanh toán)
- `id`: String (CUID)
- `ticketId`: String
- `amount`: Int (VNĐ)
- `method`: String - "ZALOPAY", "GOOGLEPAY", "CARD", "QR"
- `status`: String - "PENDING", "SUCCESS", "FAILED"
- `externalRef`: String (optional)
- `createdAt`: DateTime

## 🔐 AUTHENTICATION

### Tài khoản Admin mặc định
- **Email:** `admin@vticinema.com`
- **Password:** `admin123`

Tài khoản này được tạo tự động khi chạy `npm run seed`.

### JWT Token
- Token được tạo khi đăng nhập thành công
- Token có thời hạn (config trong `authService.js`)
- Token được gửi trong header: `Authorization: Bearer <token>`

### Middleware
- `authenticate`: Kiểm tra token hợp lệ
- `requireAdmin`: Kiểm tra user có role ADMIN

## 📡 API ENDPOINTS

### 🔓 Authentication Endpoints

| Method | Endpoint | Mô tả | Auth Required |
|--------|----------|-------|---------------|
| POST | `/api/auth/register` | Đăng ký tài khoản mới | ❌ |
| POST | `/api/auth/login` | Đăng nhập | ❌ |
| POST | `/api/auth/forgot` | Quên mật khẩu - Gửi email reset | ❌ |
| POST | `/api/auth/reset` | Đặt lại mật khẩu mới | ❌ |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại | ✅ |

**Request Body - Register:**
```json
{
  "name": "Nguyễn Văn A",
  "email": "user@example.com",
  "phone": "0901234567",
  "password": "password123"
}
```

**Request Body - Login:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response - Login:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "Nguyễn Văn A",
    "email": "user@example.com",
    "role": "USER"
  }
}
```

### 🎬 Movie Endpoints

| Method | Endpoint | Mô tả | Auth Required | Role |
|--------|----------|-------|---------------|------|
| GET | `/api/movies` | Lấy danh sách phim | ❌ | - |
| GET | `/api/movies/:id` | Lấy chi tiết phim | ❌ | - |
| POST | `/api/movies` | Tạo phim mới | ✅ | ADMIN |
| PUT | `/api/movies/:id` | Cập nhật phim | ✅ | ADMIN |
| DELETE | `/api/movies/:id` | Xóa phim | ✅ | ADMIN |

**Request Body - Create Movie:**
```json
{
  "title": "Tên phim",
  "actors": "Diễn viên",
  "duration": 120,
  "genres": "Hành động, Kịch tính",
  "releaseDate": "2025-05-01",
  "rating": 8.5,
  "description": "Mô tả phim",
  "posterUrl": "https://example.com/poster.jpg"
}
```

### 🎭 Cinema Endpoints

| Method | Endpoint | Mô tả | Auth Required | Role |
|--------|----------|-------|---------------|------|
| GET | `/api/cinemas` | Lấy danh sách rạp | ❌ | - |
| GET | `/api/cinemas/:id` | Lấy chi tiết rạp | ❌ | - |
| POST | `/api/cinemas` | Tạo rạp mới | ✅ | ADMIN |
| PUT | `/api/cinemas/:id` | Cập nhật rạp | ✅ | ADMIN |
| DELETE | `/api/cinemas/:id` | Xóa rạp | ✅ | ADMIN |

**Request Body - Create Cinema:**
```json
{
  "name": "CGV Aeon Long Biên",
  "region": "Hà Nội",
  "address": "123 Đường ABC, Quận XYZ",
  "latitude": 21.0285,
  "longitude": 105.8542,
  "logoUrl": "https://example.com/logo.jpg",
  "phone": "0241234567"
}
```

### 📅 Screening Endpoints

| Method | Endpoint | Mô tả | Auth Required | Role |
|--------|----------|-------|---------------|------|
| GET | `/api/screenings` | Lấy danh sách suất chiếu | ❌ | - |
| GET | `/api/screenings/:id` | Lấy chi tiết suất chiếu | ❌ | - |
| POST | `/api/screenings` | Tạo suất chiếu mới | ✅ | ADMIN |
| PUT | `/api/screenings/:id` | Cập nhật suất chiếu | ✅ | ADMIN |
| DELETE | `/api/screenings/:id` | Xóa suất chiếu | ✅ | ADMIN |

**Query Parameters - GET /api/screenings:**
- `movieId`: Lọc theo phim
- `cinemaId`: Lọc theo rạp
- `date`: Lọc theo ngày (YYYY-MM-DD)

**Request Body - Create Screening:**
```json
{
  "movieId": "movie_id_here",
  "cinemaId": "cinema_id_here",
  "room": "Phòng 1",
  "startTime": "2025-05-01T10:00:00Z",
  "endTime": "2025-05-01T12:00:00Z",
  "price": 100000
}
```

### 🎫 Ticket Endpoints

| Method | Endpoint | Mô tả | Auth Required | Role |
|--------|----------|-------|---------------|------|
| GET | `/api/tickets` | Lấy danh sách vé | ✅ | ADMIN |
| GET | `/api/tickets/:id` | Lấy chi tiết vé | ✅ | ADMIN |
| POST | `/api/tickets` | Tạo vé (đặt vé) | ✅ | USER |
| POST | `/api/tickets/:id/cancel` | Hủy vé | ✅ | ADMIN |
| POST | `/api/tickets/:id/lock` | Khóa vé | ✅ | ADMIN |

**Query Parameters - GET /api/tickets:**
- `status`: Lọc theo trạng thái (PENDING, SUCCESS, LOCKED, CANCELED)
- `userId`: Lọc theo user

**Request Body - Create Ticket:**
```json
{
  "screeningId": "screening_id_here",
  "seats": [
    { "seatRow": "A", "seatCol": "1" },
    { "seatRow": "A", "seatCol": "2" }
  ]
}
```

### 👤 User Endpoints

| Method | Endpoint | Mô tả | Auth Required | Role |
|--------|----------|-------|---------------|------|
| GET | `/api/users` | Lấy danh sách user | ✅ | ADMIN |
| GET | `/api/users/:id` | Lấy chi tiết user | ✅ | ADMIN |
| PUT | `/api/users/:id` | Cập nhật user | ✅ | ADMIN |
| DELETE | `/api/users/:id` | Xóa user | ✅ | ADMIN |

**Query Parameters - GET /api/users:**
- `role`: Lọc theo vai trò (USER, ADMIN)
- `status`: Lọc theo trạng thái (ACTIVE, INACTIVE)
- `search`: Tìm kiếm theo tên, email

### ⭐ Review Endpoints

| Method | Endpoint | Mô tả | Auth Required | Role |
|--------|----------|-------|---------------|------|
| GET | `/api/reviews/movie/:movieId` | Lấy đánh giá theo phim | ❌ | - |
| POST | `/api/reviews` | Tạo đánh giá | ✅ | USER |
| PUT | `/api/reviews/:id` | Cập nhật đánh giá | ✅ | USER |
| DELETE | `/api/reviews/:id` | Xóa đánh giá | ✅ | USER |

**Request Body - Create Review:**
```json
{
  "movieId": "movie_id_here",
  "rating": 9,
  "content": "Phim rất hay!",
  "tags": "Đáng xem, Siêu phẩm"
}
```

### 💳 Payment Endpoints

| Method | Endpoint | Mô tả | Auth Required | Role |
|--------|----------|-------|---------------|------|
| POST | `/api/payments` | Tạo thanh toán | ✅ | USER |
| GET | `/api/payments/:id` | Lấy chi tiết thanh toán | ✅ | USER |
| POST | `/api/payments/:id/verify` | Xác nhận thanh toán | ✅ | USER |

**Request Body - Create Payment:**
```json
{
  "ticketId": "ticket_id_here",
  "method": "ZALOPAY",
  "amount": 200000
}
```

### 💰 Revenue Endpoints

| Method | Endpoint | Mô tả | Auth Required | Role |
|--------|----------|-------|---------------|------|
| GET | `/api/revenue/stats` | Thống kê doanh thu | ✅ | ADMIN |
| GET | `/api/revenue/daily` | Doanh thu theo ngày | ✅ | ADMIN |

**Query Parameters:**
- `fromDate`: Từ ngày (YYYY-MM-DD)
- `toDate`: Đến ngày (YYYY-MM-DD)

**Response - Stats:**
```json
{
  "totalRevenue": 50000000,
  "totalTickets": 250
}
```

**Response - Daily:**
```json
[
  {
    "date": "2025-05-01",
    "revenue": 10000000
  },
  {
    "date": "2025-05-02",
    "revenue": 15000000
  }
]
```

## 🔒 MIDDLEWARE

### Authentication Middleware (`authenticate`)
- Kiểm tra token trong header `Authorization: Bearer <token>`
- Verify JWT token
- Gắn user info vào `req.user`
- Redirect đến `/login` nếu token không hợp lệ

### Admin Middleware (`requireAdmin`)
- Kiểm tra user có role `ADMIN`
- Redirect đến `/` nếu không phải admin

## 🛠️ SERVICES

### Service Pattern
Mỗi module có một service file chứa business logic:
- `authService.js` - Authentication logic
- `movieService.js` - Movie CRUD operations
- `cinemaService.js` - Cinema CRUD operations
- `screeningService.js` - Screening CRUD operations
- `ticketService.js` - Ticket operations
- `userService.js` - User management
- `reviewService.js` - Review operations
- `paymentService.js` - Payment processing
- `revenueService.js` - Revenue calculations

## 🌍 ENVIRONMENT VARIABLES

Tạo file `.env` trong folder backend:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key-here-change-in-production"
PORT=4000
NODE_ENV=development
```

## 📦 DEPENDENCIES

### Core
- `express` ^5.1.0
- `@prisma/client` ^6.18.0
- `prisma` ^6.18.0

### Authentication
- `jsonwebtoken` ^9.0.2
- `bcrypt` ^6.0.0

### Utilities
- `cors` ^2.8.5
- `dotenv` ^17.2.3
- `morgan` ^1.10.1

### Development
- `nodemon` ^3.1.10

## 🗄️ DATABASE COMMANDS

```bash
# Tạo migration mới
npx prisma migrate dev --name migration_name

# Reset database (xóa tất cả data)
npx prisma migrate reset

# Xem database trong Prisma Studio
npx prisma studio

# Generate Prisma Client
npx prisma generate
```

## 📝 ERROR HANDLING

API trả về lỗi theo format:
```json
{
  "message": "Error message",
  "error": "Detailed error (in development)"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## 🔐 SECURITY

- Passwords được hash bằng bcrypt
- JWT tokens cho authentication
- CORS enabled cho frontend
- Input validation
- SQL injection protection (Prisma ORM)

## 📊 DATABASE

- **Database:** SQLite (development)
- **ORM:** Prisma
- **Location:** `prisma/dev.db`

## 🚀 DEPLOYMENT NOTES

- Thay đổi `DATABASE_URL` trong production
- Sử dụng strong `JWT_SECRET`
- Set `NODE_ENV=production`
- Cấu hình CORS cho production domain
- Sử dụng PostgreSQL/MySQL thay vì SQLite cho production
