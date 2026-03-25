@echo off
REM OpenClaw Desktop Client - Windows Quick Start

echo ============================================================
echo        OpenClaw Desktop Client - Windows
echo ============================================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
)

REM Check directory
if not exist "package.json" (
    echo [ERROR] Run from desktop directory
    pause
    exit /b 1
)

REM Install if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

REM Compile if needed
if not exist "dist\client.js" (
    echo Compiling...
    call npm run compile
)

echo.
echo ============================================================
echo Ready!
echo ============================================================
echo.
echo Connect to Gateway:
echo.
echo   node dist\cli.js --host 5.188.119.206 --port 18789 --token 2e70d4c4434483e74406919c2948cfcf42292453c9af8793
echo.
echo Or set environment variables:
echo.
echo   set GATEWAY_HOST=5.188.119.206
echo   set GATEWAY_PORT=18789
echo   set GATEWAY_TOKEN=2e70d4c4434483e74406919c2948cfcf42292453c9af8793
echo   node dist\cli.js
echo.
pause
