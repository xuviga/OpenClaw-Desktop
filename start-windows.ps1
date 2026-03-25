# OpenClaw Desktop Client - Quick Start for Windows PowerShell
# Version: 2.0.0

param(
    [string]$Host = "127.0.0.1",
    [int]$Port = 18789,
    [string]$Name = $env:COMPUTERNAME,
    [switch]$DisableShell,
    [switch]$TLS,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
OpenClaw Desktop Client v2.0.0 - Windows PowerShell Quick Start

Usage: .\start-windows.ps1 [options]

Options:
  -Host <host>         Gateway host (default: 127.0.0.1)
  -Port <port>         Gateway port (default: 18789)
  -Name <name>         Display name (default: COMPUTERNAME)
  -DisableShell        Disable shell commands
  -TLS                 Use TLS (wss://)
  -Help                Show this help

Environment Variables (SECURE):
  GATEWAY_TOKEN        Auth token (REQUIRED)
  DISPLAY_NAME         Display name (alternative to -Name)
  GATEWAY_TLS          Use TLS (alternative to -TLS)

Examples:
  # Basic usage
  `$env:GATEWAY_TOKEN="your-token"
  .\start-windows.ps1 -Host your-gateway.com

  # Custom host and name
  `$env:GATEWAY_TOKEN="your-token"
  .\start-windows.ps1 -Host 192.168.1.100 -Name "MyWorkPC"

  # With TLS
  `$env:GATEWAY_TOKEN="your-token"
  `$env:GATEWAY_TLS="true"
  .\start-windows.ps1 -Host gateway.company.com

  # Without shell access
  `$env:GATEWAY_TOKEN="your-token"
  .\start-windows.ps1 -DisableShell

Security Notes:
  - ALWAYS use GATEWAY_TOKEN environment variable
  - NEVER use --token CLI argument (visible in Task Manager)
  - Use -TLS for production deployments

"@
    exit 0
}

# Check if token is set
if (-not $env:GATEWAY_TOKEN) {
    Write-Host ""
    Write-Host "ERROR: GATEWAY_TOKEN environment variable is required!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Set it temporarily (current session):" -ForegroundColor Yellow
    Write-Host '  $env:GATEWAY_TOKEN="your-token"' -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or permanently (user):" -ForegroundColor Yellow
    Write-Host '  [Environment]::SetEnvironmentVariable("GATEWAY_TOKEN", "your-token", "User")' -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Get your token from: openclaw status" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check if node is available
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "ERROR: Node.js is not installed or not in PATH!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check if dist folder exists
if (-not (Test-Path "dist\cli.js")) {
    Write-Host ""
    Write-Host "ERROR: dist\cli.js not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please compile first:" -ForegroundColor Yellow
    Write-Host "  npm install" -ForegroundColor Cyan
    Write-Host "  npm run compile" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Set environment variables
if ($TLS) {
    $env:GATEWAY_TLS = "true"
}

if ($DisableShell) {
    $env:OPENCLAW_DISABLE_SHELL = "1"
}

if ($Name -ne $env:COMPUTERNAME) {
    $env:DISPLAY_NAME = $Name
}

# Display startup info
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OpenClaw Desktop Client v2.0.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Gateway: " -NoNewline
Write-Host "$($Host):$Port" -ForegroundColor Green
Write-Host "Name: " -NoNewline
Write-Host "$Name" -ForegroundColor Green
Write-Host "TLS: " -NoNewline
Write-Host "$($env:GATEWAY_TLS -eq 'true')" -ForegroundColor Green
Write-Host "Shell: " -NoNewline
Write-Host "$(if ($DisableShell) { 'disabled' } else { 'enabled (whitelist)' })" -ForegroundColor Green
Write-Host ""

# Build arguments
$nodeArgs = @("dist\cli.js", "--host", $Host, "--port", $Port)

# Start client
Write-Host "Starting..." -ForegroundColor Yellow
Write-Host ""

try {
    & node $nodeArgs
}
catch {
    Write-Host ""
    Write-Host "ERROR: Failed to start client!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    exit 1
}
