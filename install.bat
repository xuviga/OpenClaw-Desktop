@echo off
REM OpenClaw Desktop Client Installer for Windows

echo ============================================================
echo        OpenClaw Desktop Client Installer
echo ============================================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+ from https://nodejs.org/
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION%

REM Check if in correct directory
if not exist "package.json" (
    echo [ERROR] Please run this script from the apps/desktop directory
    exit /b 1
)

REM Install dependencies
echo.
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed
    exit /b 1
)

REM Build
echo.
echo Building...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    exit /b 1
)

REM Create config directory
set CONFIG_DIR=%USERPROFILE%\.openclaw\desktop
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

REM Create default config if not exists
if not exist "%CONFIG_DIR%\config.json" (
    echo.
    echo Creating default config...
    (
        echo {
        echo   "gatewayHost": "127.0.0.1",
        echo   "gatewayPort": 18789,
        echo   "gatewayTls": false,
        echo   "capabilities": ["screenshot", "clipboard", "files", "shell", "system", "ui_click", "ui_type", "notification"]
        echo }
    ) > "%CONFIG_DIR%\config.json"
)

echo.
echo ============================================================
echo [OK] Installation complete!
echo ============================================================
echo.
echo Config file: %CONFIG_DIR%\config.json
echo.
echo Quick start:
echo   1. Edit config: notepad %CONFIG_DIR%\config.json
echo   2. Set your gateway host and token
echo   3. Run: npm start
echo.
echo Or use CLI options:
echo   node dist\cli.js --host YOUR_GATEWAY_IP --port 18789 --token YOUR_TOKEN
echo.
pause
