@echo off
echo ========================================
echo ScholarApp Database Setup Script
echo ========================================
echo.

REM Check if PostgreSQL is installed
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PostgreSQL is not installed or not in PATH
    echo Please install PostgreSQL from: https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

echo PostgreSQL found!
echo.

REM Prompt for postgres password
set /p POSTGRES_PASSWORD="Enter your PostgreSQL postgres user password: "

echo.
echo Creating database 'scholar_app'...
echo.

REM Create database
psql -U postgres -c "CREATE DATABASE scholar_app;" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Database 'scholar_app' created successfully!
) else (
    echo ! Database 'scholar_app' might already exist (this is OK)
)

echo.
echo Verifying database...
psql -U postgres -d scholar_app -c "\dt" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Database connection successful!
) else (
    echo ERROR: Could not connect to database
    pause
    exit /b 1
)

echo.
echo ========================================
echo Database Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Copy .env.example to .env
echo 2. Update .env with your database credentials
echo 3. Run: npm run migration:run
echo 4. Run: npm run start:dev
echo.
pause
