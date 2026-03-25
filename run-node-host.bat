@echo off
REM OpenClaw Node Host Wrapper for Windows
REM Использует встроенный node-host с правильным протоколом

echo ============================================================
echo        OpenClaw Desktop Node Host
echo ============================================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo This will connect your PC to OpenClaw Gateway.
echo.
echo Gateway: 5.188.119.206:18789
echo Token: 2e70d4c4434483e74406919c2948cfcf42292453c9af8793
echo.

REM Check if OpenClaw is installed
where openclaw >nul 2>nul
if %errorlevel% neq 0 (
    echo OpenClaw not found. Installing...
    call npm install -g openclaw
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install OpenClaw
        pause
        exit /b 1
    )
)

echo.
echo Starting node-host...
echo.

REM Run openclaw node-host with device pairing
call openclaw node-host --host 5.188.119.206 --port 18789 --token 2e70d4c4434483e74406919c2948cfcf42292453c9af8793

pause
