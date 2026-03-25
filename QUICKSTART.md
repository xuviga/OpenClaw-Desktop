# OpenClaw Desktop Client - Quick Start Guide

Version: 2.0.0 | Updated: 2026-03-25

---

## 🚀 Quick Start (3 Steps)

### 1️⃣ Download & Install

**Windows (PowerShell):**
```powershell
# Download from GitHub Releases
# https://github.com/xuviga/OpenClaw-Desktop/releases

# Extract
tar -xzf desktop-client.tar.gz
cd desktop

# Install
npm install
npm run compile
```

**Linux/macOS:**
```bash
# Download from GitHub Releases
wget https://github.com/xuviga/OpenClaw-Desktop/releases/download/v2.0.0/desktop-client.tar.gz

# Extract
tar -xzf desktop-client.tar.gz
cd desktop

# Install
npm install && npm run compile
```

### 2️⃣ Configure Token

**Windows (PowerShell):**
```powershell
# Temporary (current session)
$env:GATEWAY_TOKEN="your-token-here"

# Permanent (user)
[Environment]::SetEnvironmentVariable("GATEWAY_TOKEN", "your-token-here", "User")
```

**Linux/macOS:**
```bash
# Temporary (current session)
export GATEWAY_TOKEN="your-token-here"

# Permanent (~/.bashrc or ~/.zshrc)
echo 'export GATEWAY_TOKEN="your-token-here"' >> ~/.bashrc
source ~/.bashrc
```

### 3️⃣ Run

**Windows:**
```powershell
# Using script
.\start-windows.ps1

# Or directly
node dist\cli.js --host your-gateway.com --port 18789
```

**Linux/macOS:**
```bash
# Using script
./start-unix.sh

# Or directly
node dist/cli.js --host your-gateway.com --port 18789
```

---

## 📋 Platform-Specific Examples

### Windows (PowerShell)

#### Basic Usage
```powershell
# Set token
$env:GATEWAY_TOKEN="your-token-here"

# Run
node dist\cli.js --host your-gateway.com

# With custom name
$env:DISPLAY_NAME="MyWorkPC"
node dist\cli.js --host your-gateway.com
```

#### Production Setup
```powershell
# Set token permanently
[Environment]::SetEnvironmentVariable("GATEWAY_TOKEN", "prod-token", "User")

# Set TLS
[Environment]::SetEnvironmentVariable("GATEWAY_TLS", "true", "User")

# Set host permanently
[Environment]::SetEnvironmentVariable("GATEWAY_HOST", "gateway.company.com", "User")

# Run
node dist\cli.js
```

#### Using Config File
```powershell
# Create config
mkdir $env:USERPROFILE\.openclaw
copy desktop-config.example.json $env:USERPROFILE\.openclaw\desktop-config.json

# Edit config
notepad $env:USERPROFILE\.openclaw\desktop-config.json

# Run (auto-detects config)
node dist\cli.js
```

---

### Linux (Ubuntu/Debian)

#### Install Dependencies
```bash
# UI automation
sudo apt update
sudo apt install -y xdotool xclip gnome-screenshot libnotify-bin

# Verify
which xdotool xclip gnome-screenshot notify-send
```

#### Basic Usage
```bash
# Set token
export GATEWAY_TOKEN="your-token-here"

# Run
node dist/cli.js --host your-gateway.com

# With custom name
DISPLAY_NAME="UbuntuDev" node dist/cli.js --host your-gateway.com
```

#### Production Setup
```bash
# Add to ~/.bashrc
cat >> ~/.bashrc << 'EOF'
# OpenClaw Desktop Client
export GATEWAY_TOKEN="prod-token"
export GATEWAY_HOST="gateway.company.com"
export GATEWAY_TLS="true"
export DISPLAY_NAME="$(hostname)"
EOF

source ~/.bashrc

# Run
node dist/cli.js
```

#### Systemd Service (Auto-start)
```bash
# Create service
sudo tee /etc/systemd/system/openclaw-desktop.service > /dev/null << 'EOF'
[Unit]
Description=OpenClaw Desktop Client
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/desktop
Environment="GATEWAY_TOKEN=your-token"
Environment="GATEWAY_HOST=your-gateway.com"
ExecStart=/usr/bin/node dist/cli.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable openclaw-desktop
sudo systemctl start openclaw-desktop

# Check status
sudo systemctl status openclaw-desktop
```

---

### macOS

#### Install Dependencies
```bash
# UI automation
brew install cliclick

# Verify
which cliclick
```

#### Basic Usage
```bash
# Set token
export GATEWAY_TOKEN="your-token-here"

# Run
node dist/cli.js --host your-gateway.com

# With custom name
DISPLAY_NAME="MacBookPro" node dist/cli.js --host your-gateway.com
```

#### Production Setup
```bash
# Add to ~/.zshrc
cat >> ~/.zshrc << 'EOF'
# OpenClaw Desktop Client
export GATEWAY_TOKEN="prod-token"
export GATEWAY_HOST="gateway.company.com"
export GATEWAY_TLS="true"
export DISPLAY_NAME="$(hostname)"
EOF

source ~/.zshrc

# Run
node dist/cli.js
```

#### LaunchAgent (Auto-start)
```bash
# Create LaunchAgent
cat > ~/Library/LaunchAgents/com.openclaw.desktop.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw.desktop</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/desktop/dist/cli.js</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>GATEWAY_TOKEN</key>
        <string>your-token</string>
        <key>GATEWAY_HOST</key>
        <string>your-gateway.com</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

# Load
launchctl load ~/Library/LaunchAgents/com.openclaw.desktop.plist

# Check
launchctl list | grep openclaw
```

#### macOS Accessibility Permissions
```
1. System Preferences → Security & Privacy → Privacy
2. Select "Accessibility"
3. Click "+" and add Terminal.app (or iTerm)
4. Restart Terminal
```

---

## 🔒 Security Best Practices

### Token Management

**✅ DO:**
- Use environment variables
- Use config files with proper permissions
- Rotate tokens regularly

**❌ DON'T:**
- Use `--token` CLI argument (visible in process list)
- Commit tokens to git
- Share tokens in chat/email

### Network Security

**✅ DO:**
- Use TLS in production
- Restrict firewall rules
- Use VPN for sensitive access

**❌ DON'T:**
- Use plain WebSocket over public networks
- Allow unrestricted outbound access

### Access Control

**✅ DO:**
- Use minimal whitelist
- Disable shell if not needed
- Monitor logs

**❌ DON'T:**
- Allow all commands
- Grant unnecessary permissions
- Ignore rate limit warnings

---

## ❓ Troubleshooting

### Windows: "Token required"
```powershell
# Check if token is set
echo $env:GATEWAY_TOKEN

# If empty, set it
$env:GATEWAY_TOKEN="your-token"
```

### Linux: "xdotool not found"
```bash
# Install
sudo apt install xdotool

# Verify
which xdotool
```

### macOS: "cliclick not found"
```bash
# Install
brew install cliclick

# Verify
which cliclick
```

### All: "WebSocket not connected"
```bash
# Check gateway
ping your-gateway.com

# Check port
telnet your-gateway.com 18789

# Check firewall
# Linux: sudo ufw status
# Windows: Check Windows Firewall
```

---

## 📞 Support

- **Docs:** [README.md](./README.md) | [SECURITY.md](./SECURITY.md)
- **Issues:** https://github.com/xuviga/OpenClaw-Desktop/issues
- **Discord:** https://discord.com/invite/clawd
- **Email:** support@openclaw.ai

---

**Made with ❤️ by OpenClaw Team**
