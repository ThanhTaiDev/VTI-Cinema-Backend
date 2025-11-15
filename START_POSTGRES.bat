@echo off
echo ========================================
echo   KHOI DONG POSTGRESQL LOCAL
echo ========================================
echo.

REM Kiem tra Docker
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Docker Desktop chua chay!
    echo.
    echo Vui long:
    echo   1. Mo Docker Desktop
    echo   2. Doi Docker khoi dong xong (icon Docker o system tray)
    echo   3. Chay lai file nay
    echo.
    pause
    exit /b 1
)

echo [OK] Docker da chay
echo.

REM Start PostgreSQL
echo Dang khoi dong PostgreSQL container...
docker-compose up -d

if %errorlevel% neq 0 (
    echo [LOI] Khong the khoi dong PostgreSQL!
    pause
    exit /b 1
)

echo.
echo Dang cho PostgreSQL khoi dong (10 giay)...
timeout /t 10 /nobreak >nul

REM Kiem tra PostgreSQL
docker exec vtcinema-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] PostgreSQL da san sang!
    echo.
    echo Database: vtcinema
    echo User: postgres
    echo Password: postgres
    echo Port: 5432
    echo.
    echo Tiep theo: Chay "npm run migrate" de tao tables
) else (
    echo [CANH BAO] PostgreSQL chua san sang, vui long doi them...
)

echo.
pause

