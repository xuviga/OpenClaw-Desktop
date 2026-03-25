#!/bin/bash
# OpenClaw Desktop Client - Quick Start for Linux/macOS
# Version: 2.0.0

# Default values
HOST="${GATEWAY_HOST:-127.0.0.1}"
PORT="${GATEWAY_PORT:-18789}"
NAME="${DISPLAY_NAME:-$(hostname)}"
DISABLE_SHELL="${OPENCLAW_DISABLE_SHELL:-false}"
TLS="${GATEWAY_TLS:-false}"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            HOST="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --name)
            NAME="$2"
            shift 2
            ;;
        --disable-shell)
            DISABLE_SHELL="true"
            shift
            ;;
        --tls)
            TLS="true"
            shift
            ;;
        --help|-h)
            cat << EOF
OpenClaw Desktop Client v2.0.0 - Linux/macOS Quick Start

Usage: ./start-unix.sh [options]

Options:
  --host <host>         Gateway host (default: 127.0.0.1)
  --port <port>         Gateway port (default: 18789)
  --name <name>         Display name (default: hostname)
  --disable-shell       Disable shell commands
  --tls                 Use TLS (wss://)
  --help, -h            Show this help

Environment Variables (SECURE):
  GATEWAY_TOKEN         Auth token (REQUIRED)
  GATEWAY_HOST          Gateway host
  GATEWAY_PORT          Gateway port
  GATEWAY_TLS           Use TLS (true/false)
  DISPLAY_NAME          Display name
  OPENCLAW_DISABLE_SHELL  Disable shell (1/true)

Examples:
  # Basic usage
  export GATEWAY_TOKEN="your-token"
  ./start-unix.sh --host your-gateway.com

  # Custom host and name
  export GATEWAY_TOKEN="your-token"
  ./start-unix.sh --host 192.168.1.100 --name "MyWorkPC"

  # With TLS
  export GATEWAY_TOKEN="your-token"
  export GATEWAY_TLS="true"
  ./start-unix.sh --host gateway.company.com

  # Without shell access
  export GATEWAY_TOKEN="your-token"
  ./start-unix.sh --disable-shell

Security Notes:
  - ALWAYS use GATEWAY_TOKEN environment variable
  - NEVER use --token CLI argument (visible in ps aux)
  - Use --tls for production deployments

EOF
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check if token is set
if [ -z "$GATEWAY_TOKEN" ]; then
    echo ""
    echo "ERROR: GATEWAY_TOKEN environment variable is required!"
    echo ""
    echo "Set it temporarily (current session):"
    echo "  export GATEWAY_TOKEN=\"your-token\""
    echo ""
    echo "Or permanently (add to ~/.bashrc or ~/.zshrc):"
    echo "  echo 'export GATEWAY_TOKEN=\"your-token\"' >> ~/.bashrc"
    echo "  source ~/.bashrc"
    echo ""
    echo "Get your token from: openclaw status"
    echo ""
    exit 1
fi

# Check if node is available
if ! command -v node &> /dev/null; then
    echo ""
    echo "ERROR: Node.js is not installed or not in PATH!"
    echo ""
    echo "Install Node.js from: https://nodejs.org/"
    echo ""
    echo "Or use package manager:"
    echo "  Ubuntu/Debian: sudo apt install nodejs"
    echo "  macOS: brew install node"
    echo "  Fedora: sudo dnf install nodejs"
    echo ""
    exit 1
fi

# Check if dist folder exists
if [ ! -f "dist/cli.js" ]; then
    echo ""
    echo "ERROR: dist/cli.js not found!"
    echo ""
    echo "Please compile first:"
    echo "  npm install"
    echo "  npm run compile"
    echo ""
    exit 1
fi

# Export environment variables
export GATEWAY_HOST="$HOST"
export GATEWAY_PORT="$PORT"
export GATEWAY_TLS="$TLS"
export DISPLAY_NAME="$NAME"
export OPENCLAW_DISABLE_SHELL="$DISABLE_SHELL"

# Display startup info
echo ""
echo "========================================"
echo "  OpenClaw Desktop Client v2.0.0"
echo "========================================"
echo ""
echo "Gateway: $HOST:$PORT"
echo "Name: $NAME"
echo "TLS: $TLS"
echo "Shell: $(if [ "$DISABLE_SHELL" = "true" ]; then echo "disabled"; else echo "enabled (whitelist)"; fi)"
echo ""

# Build arguments
NODE_ARGS=("dist/cli.js")

# Start client
echo "Starting..."
echo ""

node "${NODE_ARGS[@]}"
