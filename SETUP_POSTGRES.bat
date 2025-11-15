@echo off
echo ========================================
echo   SETUP POSTGRESQL - CHUYEN TU SQLITE
echo ========================================
echo.

REM Kiem tra Docker
echo [1/6] Kiem tra Docker...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Docker Desktop chua chay!
    echo.
    echo Vui long:
    echo   1. Mo Docker Desktop
    echo   2. Doi Docker khoi dong xong
    echo   3. Chay lai file nay
    echo.
    pause
    exit /b 1
)
echo [OK] Docker da chay
echo.

REM Start PostgreSQL
echo [2/6] Khoi dong PostgreSQL...
docker-compose up -d
if %errorlevel% neq 0 (
    echo [LOI] Khong the khoi dong PostgreSQL!
    pause
    exit /b 1
)
echo [OK] PostgreSQL container da khoi dong
echo.

REM Doi PostgreSQL san sang
echo [3/6] Doi PostgreSQL san sang (15 giay)...
timeout /t 15 /nobreak >nul

REM Kiem tra PostgreSQL
docker exec vtcinema-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo [CANH BAO] PostgreSQL chua san sang, nhung tiep tuc...
)
echo.

REM Generate Prisma Client
echo [4/6] Generate Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [LOI] Generate Prisma Client that bai!
    pause
    exit /b 1
)
echo [OK] Prisma Client da duoc generate
echo.

REM Tao migration
echo [5/6] Tao migration cho PostgreSQL...
call npx prisma migrate dev --name init_postgresql
if %errorlevel% neq 0 (
    echo [LOI] Tao migration that bai!
    echo.
    echo Kiem tra:
    echo   - PostgreSQL da chay chua? (chay START_POSTGRES.bat)
    echo   - DATABASE_URL trong .env dung chua?
    pause
    exit /b 1
)
echo [OK] Migration da duoc tao
echo.

REM Seed database
echo [6/6] Seed database...
call node scripts/seed.js
if %errorlevel% neq 0 (
    echo [CANH BAO] Seed database co loi, nhung khong anh huong
)
call node scripts/seedPaymentGateways.js
if %errorlevel% neq 0 (
    echo [CANH BAO] Seed payment gateways co loi, nhung khong anh huong
)
echo.

echo ========================================
echo   HOAN THANH!
echo ========================================
echo.
echo PostgreSQL da san sang!
echo.
echo Database: vtcinema
echo User: postgres  
echo Password: postgres
echo Port: 5432
echo.
echo Chay server: npm run dev
echo.
pause

