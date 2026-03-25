#!/bin/bash
# Quick start script for OpenClaw Desktop Client

cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

if [ ! -d "dist" ]; then
    echo "Building..."
    npm run build
fi

echo "Starting OpenClaw Desktop Client..."
node dist/cli.js "$@"
