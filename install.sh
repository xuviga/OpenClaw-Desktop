#!/bin/bash

# OpenClaw Desktop Client Installer
# Supports: Linux, macOS

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        OpenClaw Desktop Client Installer                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+ first.${NC}"
    echo "  https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}✗ Node.js version too old. Need 18+, got $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Please run this script from the apps/desktop directory${NC}"
    exit 1
fi

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Build
echo -e "${BLUE}Building...${NC}"
npm run build

# Create config directory
CONFIG_DIR="$HOME/.openclaw/desktop"
mkdir -p "$CONFIG_DIR"

# Create default config if not exists
if [ ! -f "$CONFIG_DIR/config.json" ]; then
    echo -e "${BLUE}Creating default config...${NC}"
    cat > "$CONFIG_DIR/config.json" << EOF
{
  "gatewayHost": "127.0.0.1",
  "gatewayPort": 18789,
  "gatewayTls": false,
  "displayName": "$(hostname)",
  "capabilities": ["screenshot", "clipboard", "files", "shell", "system", "ui_click", "ui_type", "notification"]
}
EOF
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Installation Complete!                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Config file: $CONFIG_DIR/config.json"
echo ""
echo "Platform-specific requirements:"
echo ""

case "$(uname -s)" in
    Linux*)
        echo "Linux dependencies:"
        echo "  sudo apt install xdotool xclip gnome-screenshot libnotify-bin"
        echo "  # or for RPM-based:"
        echo "  sudo dnf install xdotool xclip gnome-screenshot libnotify"
        ;;
    Darwin*)
        echo "macOS dependencies:"
        echo "  brew install cliclick"
        ;;
esac

echo ""
echo "Quick start:"
echo "  1. Edit config: nano $CONFIG_DIR/config.json"
echo "  2. Set your gateway host and token"
echo "  3. Run: npm start"
echo ""
echo "Or use CLI options:"
echo "  node dist/cli.js --host YOUR_GATEWAY_IP --port 18789 --token YOUR_TOKEN"
echo ""
