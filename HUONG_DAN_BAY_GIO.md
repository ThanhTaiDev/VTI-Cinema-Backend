# 🚀 Hướng dẫn Chuyển SQLite → PostgreSQL (Bây giờ)

## ✅ Đã hoàn thành:
1. ✅ Đã sửa Prisma schema: `provider = "postgresql"`
2. ✅ Đã tạo file `.env` với DATABASE_URL cho PostgreSQL
3. ✅ Đã generate Prisma Client thành công

## 🔴 Cần làm ngay:

### Bước 1: Mở Docker Desktop
1. Mở **Docker Desktop** trên Windows
2. Đợi Docker khởi động xong (icon Docker ở system tray sẽ xanh)
3. Kiểm tra: Docker Desktop hiển thị "Docker Desktop is running"

### Bước 2: Chạy script tự động

**Cách 1: Dùng script (Khuyến nghị)**
```bash
# Chạy file này (double-click hoặc chạy trong terminal)
SETUP_POSTGRES.bat
```

**Cách 2: Chạy thủ công**
```bash
# 1. Khởi động PostgreSQL
docker-compose up -d

# 2. Đợi 15 giây để PostgreSQL khởi động

# 3. Tạo migration
npx prisma migrate dev --name init_postgresql

# 4. Seed database
node scripts/seed.js
node scripts/seedPaymentGateways.js
```

### Bước 3: Kiểm tra

```bash
# Chạy server
npm run dev

# Server sẽ chạy tại http://localhost:3000
# Kiểm tra: http://localhost:3000/api/health
```

## 🐛 Nếu gặp lỗi:

### Lỗi: "Can't reach database server"
- **Nguyên nhân**: Docker Desktop chưa chạy hoặc PostgreSQL chưa khởi động xong
- **Giải pháp**: 
  1. Mở Docker Desktop
  2. Chạy `START_POSTGRES.bat` để khởi động PostgreSQL
  3. Đợi 15-20 giây
  4. Chạy lại migration

### Lỗi: "Docker Desktop not running"
- **Giải pháp**: Mở Docker Desktop và đợi nó khởi động xong

### Lỗi: "Port 5432 already in use"
- **Nguyên nhân**: Có PostgreSQL khác đang chạy
- **Giải pháp**: 
  ```bash
  # Dừng container cũ
  docker-compose down
  
  # Hoặc đổi port trong docker-compose.yml
  ```

## 📝 Checklist:

- [ ] Docker Desktop đã mở và chạy
- [ ] PostgreSQL container đã khởi động (`docker ps` thấy container)
- [ ] Migration đã chạy thành công
- [ ] Database đã được seed
- [ ] Server chạy OK (`npm run dev`)

## 🎉 Sau khi hoàn thành:

Dự án của bạn đã chuyển sang PostgreSQL và sẵn sàng để:
1. Test local
2. Deploy lên Vercel

---

**Lưu ý**: Nếu không muốn dùng Docker, có thể cài PostgreSQL trực tiếp trên Windows:
- Download: https://www.postgresql.org/download/windows/
- Cài đặt và tạo database `vtcinema`
- Cập nhật DATABASE_URL trong `.env`

