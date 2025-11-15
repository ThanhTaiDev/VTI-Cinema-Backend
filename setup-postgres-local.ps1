# PowerShell script để setup PostgreSQL local
Write-Host "=== Setup PostgreSQL Local ===" -ForegroundColor Green

# Kiểm tra Docker
Write-Host "`n1. Kiểm tra Docker..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker chưa chạy. Vui lòng:" -ForegroundColor Red
    Write-Host "  - Mở Docker Desktop" -ForegroundColor Yellow
    Write-Host "  - Đợi Docker khởi động xong" -ForegroundColor Yellow
    Write-Host "  - Chạy lại script này" -ForegroundColor Yellow
    exit 1
}

# Start PostgreSQL container
Write-Host "`n2. Khởi động PostgreSQL container..." -ForegroundColor Yellow
docker-compose up -d

# Đợi PostgreSQL sẵn sàng
Write-Host "`n3. Đợi PostgreSQL khởi động..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Kiểm tra PostgreSQL
Write-Host "`n4. Kiểm tra PostgreSQL..." -ForegroundColor Yellow
$pgReady = docker exec vtcinema-postgres pg_isready -U postgres 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "PostgreSQL đã sẵn sàng!" -ForegroundColor Green
} else {
    Write-Host "Đang đợi PostgreSQL..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Tạo .env file
Write-Host "`n5. Tạo file .env..." -ForegroundColor Yellow
$envContent = @"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vtcinema?schema=public"
JWT_SECRET="dev-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
PORT=3000
"@

if (Test-Path .env) {
    Copy-Item .env .env.backup
    Write-Host "Đã backup .env thành .env.backup" -ForegroundColor Yellow
}

$envContent | Out-File -FilePath .env -Encoding utf8
Write-Host "Đã tạo file .env" -ForegroundColor Green

# Generate Prisma Client
Write-Host "`n6. Generate Prisma Client..." -ForegroundColor Yellow
npx prisma generate

# Tạo migration
Write-Host "`n7. Tạo migration cho PostgreSQL..." -ForegroundColor Yellow
npx prisma migrate dev --name init_postgresql

# Seed database
Write-Host "`n8. Seed database..." -ForegroundColor Yellow
node scripts/seed.js
node scripts/seedPaymentGateways.js

Write-Host "`n=== Hoàn thành! ===" -ForegroundColor Green
Write-Host "PostgreSQL đang chạy tại: localhost:5432" -ForegroundColor Cyan
Write-Host "Database: vtcinema" -ForegroundColor Cyan
Write-Host "User: postgres" -ForegroundColor Cyan
Write-Host "Password: postgres" -ForegroundColor Cyan
Write-Host "`nChạy server: npm run dev" -ForegroundColor Yellow

