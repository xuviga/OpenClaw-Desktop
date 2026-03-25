#!/bin/bash
# OpenClaw Desktop Client - Health Monitor
# Restarts client on disconnect, monitors Gateway connection

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI="$SCRIPT_DIR/dist/cli.js"
LOG="$SCRIPT_DIR/health.log"
PIDFILE="$SCRIPT_DIR/client.pid"

# Config
GATEWAY_HOST="${GATEWAY_HOST:-127.0.0.1}"
GATEWAY_PORT="${GATEWAY_PORT:-18789}"
GATEWAY_TOKEN="${GATEWAY_TOKEN:-}"
RESTART_DELAY=5
PING_INTERVAL=30

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"
}

check_gateway() {
    # Ping Gateway
    if nc -z -w5 "$GATEWAY_HOST" "$GATEWAY_PORT" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

start_client() {
    if [ -z "$GATEWAY_TOKEN" ]; then
        log "ERROR: GATEWAY_TOKEN not set"
        exit 1
    fi
    
    log "Starting client..."
    node "$CLI" --host "$GATEWAY_HOST" --port "$GATEWAY_PORT" --token "$GATEWAY_TOKEN" &
    echo $! > "$PIDFILE"
    log "Client started (PID: $(cat $PIDFILE))"
}

stop_client() {
    if [ -f "$PIDFILE" ]; then
        PID=$(cat "$PIDFILE")
        if kill -0 "$PID" 2>/dev/null; then
            log "Stopping client (PID: $PID)..."
            kill "$PID" 2>/dev/null || true
            rm -f "$PIDFILE"
        fi
    fi
}

check_client() {
    if [ -f "$PIDFILE" ]; then
        PID=$(cat "$PIDFILE")
        if kill -0 "$PID" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# Main loop
log "=== OpenClaw Desktop Health Monitor Started ==="
log "Gateway: $GATEWAY_HOST:$GATEWAY_PORT"
log "PID file: $PIDFILE"

trap 'log "Received shutdown signal"; stop_client; exit 0' SIGTERM SIGINT

while true; do
    # Check Gateway
    if ! check_gateway; then
        log "WARNING: Gateway not reachable, waiting..."
        sleep "$RESTART_DELAY"
        continue
    fi
    
    # Check client
    if ! check_client; then
        log "Client not running, starting..."
        start_client
        sleep 5  # Wait for startup
    fi
    
    sleep "$PING_INTERVAL"
done
