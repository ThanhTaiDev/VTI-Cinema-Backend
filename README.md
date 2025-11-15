# 🎬 VTI Cinema - Hệ Thống Quản Lý Rạp Chiếu Phim

Hệ thống quản lý rạp chiếu phim đầy đủ chức năng với giao diện web hiện đại, hỗ trợ đặt vé online, thanh toán đa phương thức, và quản lý toàn diện.

## 🌐 Live Demo

- **Frontend**: [https://frontend-website-xem-phim.vercel.app](https://frontend-website-xem-phim.vercel.app)
- **Backend API**: [https://backend-website-xem-phim-v2.vercel.app](https://backend-website-xem-phim-v2.vercel.app)
- **API Health Check**: [https://backend-website-xem-phim-v2.vercel.app/api/health](https://backend-website-xem-phim-v2.vercel.app/api/health)

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Tính năng](#tính-năng)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Cài đặt](#cài-đặt)
- [Cấu hình](#cấu-hình)
- [Chạy dự án](#chạy-dự-án)
- [Deploy](#deploy)
- [API Documentation](#api-documentation)
- [Tài khoản demo](#tài-khoản-demo)

## 🎯 Tổng quan

VTI Cinema là hệ thống quản lý rạp chiếu phim hoàn chỉnh bao gồm:

- **Frontend**: Giao diện web responsive với React + Vite
- **Backend**: RESTful API với Node.js + Express
- **Database**: PostgreSQL (production) / SQLite (development)
- **Authentication**: JWT-based với RBAC (Role-Based Access Control)
- **Payment**: Tích hợp nhiều cổng thanh toán (VNPay, MoMo, ZaloPay, etc.)

## ✨ Tính năng

### 👤 Người dùng
- ✅ Xem danh sách phim đang chiếu / sắp chiếu
- ✅ Xem chi tiết phim (trailer, diễn viên, đánh giá)
- ✅ Đặt vé online với chọn ghế trực quan
- ✅ Thanh toán qua nhiều cổng thanh toán
- ✅ Xem lịch sử vé đã mua
- ✅ Đánh giá và review phim
- ✅ Xem tin khuyến mãi

### 👨‍💼 Admin
- ✅ Dashboard tổng quan với thống kê real-time
- ✅ Quản lý phim (CRUD, upload poster/trailer)
- ✅ Quản lý rạp chiếu và phòng chiếu
- ✅ Quản lý suất chiếu và giá vé
- ✅ Quản lý ghế ngồi (STANDARD, VIP, COUPLE)
- ✅ Quản lý vé và đơn hàng
- ✅ Quản lý thanh toán và hoàn tiền
- ✅ Thống kê chi tiết:
  - Thống kê doanh thu
  - Thống kê phim (top phim, doanh thu)
  - Thống kê rạp (doanh thu, số vé)
  - Thống kê vé (theo trạng thái, ngày)
  - Thống kê suất chiếu
  - Thống kê tin khuyến mãi
- ✅ Quản lý tài khoản và phân quyền (RBAC)
- ✅ Quản lý tin khuyến mãi và banner

## 🛠️ Công nghệ sử dụng

### Frontend
- **React 19** - UI Framework
- **Vite** - Build tool
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **Day.js** - Date handling

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **Prisma** - ORM
- **PostgreSQL** - Database (production)
- **SQLite** - Database (development)
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Express Rate Limit** - Rate limiting

### Payment Gateways
- VNPay
- MoMo
- ZaloPay
- ShopeePay
- Napas QR
- PayPal
- Credit Card (Mock)

### Deployment
- **Vercel** - Frontend & Backend hosting
- **Prisma Data Platform** - Database hosting

## 📁 Cấu trúc dự án

```
.
├── Backend_WebsiteXemPhim/     # Backend API
│   ├── api/                    # Vercel serverless functions
│   ├── prisma/                 # Database schema & migrations
│   ├── scripts/                # Utility scripts
│   └── src/
│       ├── config/             # Configuration
│       ├── controllers/        # Request handlers
│       ├── services/           # Business logic
│       ├── routes/             # API routes
│       ├── middlewares/        # Middleware
│       ├── gateways/           # Payment gateways
│       └── utils/              # Utilities
│
└── Frontend_WebsiteXemPhim/    # Frontend React App
    ├── public/                 # Static files
    └── src/
        ├── components/         # React components
        ├── pages/              # Page components
        ├── services/           # API services
        ├── hooks/              # Custom hooks
        ├── utils/              # Utilities
        └── config/             # Configuration
```

## 📦 Cài đặt

### Yêu cầu
- Node.js >= 18.x
- npm hoặc yarn
- PostgreSQL (cho production) hoặc SQLite (cho development)

### 1. Clone repositories

```bash
# Backend
git clone https://github.com/ThanhTaiDev/Backend_WebsiteXemPhim.git
cd Backend_WebsiteXemPhim

# Frontend (terminal mới)
git clone https://github.com/ThanhTaiDev/Frontend_WebsiteXemPhim.git
cd Frontend_WebsiteXemPhim
```

### 2. Cài đặt dependencies

**Backend:**
```bash
cd Backend_WebsiteXemPhim
npm install
```

**Frontend:**
```bash
cd Frontend_WebsiteXemPhim
npm install
```

## ⚙️ Cấu hình

### Backend

Tạo file `.env` trong `Backend_WebsiteXemPhim/`:

```env
# Database
DATABASE_URL="file:./prisma/dev.db"  # SQLite (dev) hoặc PostgreSQL URL (prod)

# JWT
JWT_SECRET="your-secret-key-here-change-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV=development

# Frontend URL (cho CORS và redirects)
FRONTEND_URL="http://localhost:5173"

# Payment Gateways (tùy chọn)
VNPAY_TMN_CODE="your-tmn-code"
MOMO_PARTNER_CODE="your-partner-code"
```

### Frontend

Tạo file `.env` trong `Frontend_WebsiteXemPhim/`:

```env
VITE_API_URL=http://localhost:3000/api
```

## 🚀 Chạy dự án

### Development

**Backend:**
```bash
cd Backend_WebsiteXemPhim

# Setup database
npm run migrate
npm run seed

# Chạy server
npm run dev
```

Server chạy tại: `http://localhost:3000`

**Frontend:**
```bash
cd Frontend_WebsiteXemPhim
npm run dev
```

App chạy tại: `http://localhost:5173`

### Production

**Backend:**
```bash
npm start
```

**Frontend:**
```bash
npm run build
npm run preview
```

## 🚀 Deploy

### Vercel Deployment

Dự án đã được deploy lên Vercel:

- **Backend**: [https://backend-website-xem-phim-v2.vercel.app](https://backend-website-xem-phim-v2.vercel.app)
- **Frontend**: [https://frontend-website-xem-phim.vercel.app](https://frontend-website-xem-phim.vercel.app)

### Environment Variables trên Vercel

**Backend:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key cho JWT
- `JWT_EXPIRES_IN` - JWT expiration time
- `FRONTEND_URL` - Frontend URL cho CORS
- `NODE_ENV` - production

**Frontend:**
- `VITE_API_URL` - Backend API URL

### Database

Database sử dụng **PostgreSQL** trên Prisma Data Platform cho production.

## 📚 API Documentation

### Base URL

**Production**: `https://backend-website-xem-phim-v2.vercel.app/api`  
**Development**: `http://localhost:3000/api`

### Authentication

Hầu hết API yêu cầu authentication. Gửi token trong header:

```
Authorization: Bearer <token>
```

### Các nhóm API chính

#### Authentication (`/api/auth`)
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user

#### Movies (`/api/movies`)
- `GET /api/movies` - Danh sách phim
- `GET /api/movies/:id` - Chi tiết phim
- `POST /api/admin/movies` - Tạo phim (Admin)
- `PUT /api/admin/movies/:id` - Cập nhật phim (Admin)

#### Screenings (`/api/screenings`)
- `GET /api/screenings` - Danh sách suất chiếu
- `GET /api/screenings/:id/seats` - Lấy sơ đồ ghế
- `POST /api/admin/screenings` - Tạo suất chiếu (Admin)

#### Tickets & Orders (`/api/tickets`, `/api/orders`)
- `GET /api/tickets` - Danh sách vé
- `POST /api/orders` - Tạo đơn hàng
- `GET /api/orders/:id` - Chi tiết đơn hàng

#### Payments (`/api/payments`)
- `POST /api/payments/init` - Khởi tạo thanh toán
- `GET /api/payments/:id` - Chi tiết thanh toán
- `POST /api/payments/webhook/:gateway` - Webhook từ gateway

#### Admin Dashboard (`/api/admin/dashboard`)
- `GET /api/admin/dashboard/summary` - Tổng quan
- `GET /api/admin/dashboard/revenue-chart` - Biểu đồ doanh thu

Xem chi tiết trong [Backend README](./Backend_WebsiteXemPhim/README.md)

## 🔑 Tài khoản demo

### Admin
- **Email**: `admin@vticinema.com`
- **Password**: `admin123`

### User
- **Email**: `user@example.com`
- **Password**: `user123`

## 📖 Tài liệu chi tiết

- [Backend README](./Backend_WebsiteXemPhim/README.md) - Chi tiết về Backend API
- [Frontend README](./Frontend_WebsiteXemPhim/README.md) - Chi tiết về Frontend

## 🔒 Security

- JWT authentication
- Password hashing (bcrypt)
- Rate limiting
- Input validation
- SQL injection protection (Prisma)
- CORS configuration

## 📝 License

Private project - All rights reserved

## 👥 Contributors

- **Vo Van Thanh Tai** - Developer

## 📞 Support

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra logs trong console
2. Kiểm tra database connection
3. Kiểm tra environment variables
4. Xem API documentation

---

**Version**: 1.0.0  
**Last Updated**: November 2025
