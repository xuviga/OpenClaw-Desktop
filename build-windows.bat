@echo off
REM Build OpenClaw Desktop Client for Windows
REM Run this on a Windows machine

echo ============================================================
echo        OpenClaw Desktop Client - Windows Builder
echo ============================================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org/
    exit /b 1
)

REM Check if in correct directory
if not exist "package.json" (
    echo [ERROR] Run this script from the desktop directory
    exit /b 1
)

REM Install dependencies
echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed
    exit /b 1
)

REM Compile TypeScript
echo [2/4] Compiling TypeScript...
call npm run compile
if %errorlevel% neq 0 (
    echo [ERROR] TypeScript compilation failed
    exit /b 1
)

REM Build Windows installer
echo [3/4] Building Windows installers...
call npm run build:win
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    exit /b 1
)

echo [4/4] Done!
echo.
echo ============================================================
echo Build complete! Check the 'release' folder.
echo ============================================================
echo.
echo Generated files:
dir /b release\*.exe release\*.msi 2>nul
echo.
pause
