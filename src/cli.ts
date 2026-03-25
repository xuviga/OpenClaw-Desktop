#!/usr/bin/env node
/**
 * OpenClaw Desktop Node - CLI Version
 * Secure client using OpenClaw Gateway protocol v3
 * 
 * Security: Tokens should be passed via environment variables or config file,
 * not command-line arguments (which are visible in process listings).
 */

import { DesktopClient } from "./client.js";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

interface Config {
  gatewayHost: string;
  gatewayPort: number;
  gatewayTls: boolean;
  gatewayToken: string;
  displayName: string;
  enableShell: boolean;
  allowedCommands?: string[];
}

/**
 * Load config from file
 */
function loadConfigFile(): Partial<Config> | null {
  const configPaths = [
    path.join(os.homedir(), '.openclaw', 'desktop-config.json'),
    path.join(os.homedir(), '.config', 'openclaw-desktop', 'config.json'),
    './openclaw-desktop.json',
  ];
  
  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(raw);
        console.log(`[Config] Loaded from: ${configPath}`);
        return config;
      } catch (err) {
        console.warn(`[Config] Failed to load ${configPath}:`, err);
      }
    }
  }
  
  return null;
}

/**
 * Show help
 */
function showHelp(): void {
  console.log(`
OpenClaw Desktop Node v2.0.0

Usage: openclaw-desktop-node [options]

Configuration (in order of priority):
  1. Command-line arguments (except --token, use env vars instead)
  2. Environment variables
  3. Config file (~/.openclaw/desktop-config.json)
  4. Default values

Options:
  --host <host>           Gateway host (default: 127.0.0.1)
  --port <port>           Gateway port (default: 18789)
  --tls                   Use TLS (wss://)
  --name <name>           Display name for this device
  --config <path>         Path to config file
  --disable-shell         Disable shell commands
  --help                  Show this help

Environment Variables:
  GATEWAY_HOST            Gateway host
  GATEWAY_PORT            Gateway port
  GATEWAY_TLS             Use TLS (true/false)
  GATEWAY_TOKEN           Auth token (SECURE - use this instead of --token)
  DISPLAY_NAME            Display name
  OPENCLAW_DISABLE_SHELL  Disable shell commands (set to "1" or "true")

Config File Format (~/.openclaw/desktop-config.json):
  {
    "gatewayHost": "your-gateway.com",
    "gatewayPort": 18789,
    "gatewayTls": false,
    "gatewayToken": "your-secure-token-here",
    "displayName": "MyPC",
    "enableShell": true,
    "allowedCommands": ["ls", "cat", "git", "node"]
  }

Security Notes:
  - Tokens via CLI args (--token) are DEPRECATED and visible in process listings
  - Use GATEWAY_TOKEN env var or config file instead
  - Shell commands are restricted to a whitelist by default
  - Dangerous commands (rm -rf, format, etc.) are blocked

Examples:
  # Using environment variables (RECOMMENDED)
  export GATEWAY_TOKEN="your-token"
  openclaw-desktop-node --host your-gateway.com --port 18789
  
  # Using config file
  openclaw-desktop-node --config ~/.openclaw/desktop-config.json
  
  # Quick test (token visible in process list - not recommended)
  GATEWAY_TOKEN="your-token" openclaw-desktop-node --host your-gateway.com
  
  # With custom name
  DISPLAY_NAME="WorkPC" openclaw-desktop-node
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    process.exit(0);
  }

  // Load config file first (lowest priority)
  const fileConfig = loadConfigFile() || {};
  
  // Build config with priority: CLI > ENV > FILE > DEFAULT
  let config: Config = {
    gatewayHost: '127.0.0.1',
    gatewayPort: 18789,
    gatewayTls: false,
    gatewayToken: '',
    displayName: os.hostname(),
    enableShell: true,
    ...fileConfig,
  };
  
  // Override with environment variables
  config.gatewayHost = process.env.GATEWAY_HOST || config.gatewayHost;
  config.gatewayPort = parseInt(process.env.GATEWAY_PORT || String(config.gatewayPort), 10);
  config.gatewayTls = process.env.GATEWAY_TLS === 'true' || config.gatewayTls;
  config.gatewayToken = process.env.GATEWAY_TOKEN || process.env.OPENCLAW_TOKEN || config.gatewayToken;
  config.displayName = process.env.DISPLAY_NAME || config.displayName;
  config.enableShell = process.env.OPENCLAW_DISABLE_SHELL !== '1' && 
                       process.env.OPENCLAW_DISABLE_SHELL !== 'true' && 
                       config.enableShell;
  
  // Override with command-line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--host":
        config.gatewayHost = args[++i];
        break;
      case "--port":
        config.gatewayPort = parseInt(args[++i], 10);
        break;
      case "--token": {
        // DEPRECATED - show warning
        console.warn("⚠️  WARNING: --token is deprecated and visible in process listings!");
        console.warn("   Use GATEWAY_TOKEN environment variable instead.");
        console.warn("   Example: GATEWAY_TOKEN=your-token openclaw-desktop-node --host ...");
        console.warn("");
        config.gatewayToken = args[++i];
        break;
      }
      case "--tls":
        config.gatewayTls = true;
        break;
      case "--name":
        config.displayName = args[++i];
        break;
      case "--config": {
        const configPath = args[++i];
        try {
          const raw = fs.readFileSync(configPath, 'utf8');
          const loadedConfig = JSON.parse(raw);
          config = { ...config, ...loadedConfig };
          console.log(`[Config] Loaded from: ${configPath}`);
        } catch (err) {
          console.error(`[Config] Failed to load ${configPath}:`, err);
          process.exit(1);
        }
        break;
      }
      case "--disable-shell":
        config.enableShell = false;
        break;
    }
  }

  // Validate required config
  if (!config.gatewayToken) {
    console.error("Error: Gateway token is required");
    console.error("");
    console.error("Set via environment variable:");
    console.error("  export GATEWAY_TOKEN='your-token'");
    console.error("  openclaw-desktop-node --host HOST --port PORT");
    console.error("");
    console.error("Or via config file (~/.openclaw/desktop-config.json):");
    console.error('  {"gatewayToken": "your-token", "gatewayHost": "HOST"}');
    console.error("");
    console.error("Get token from: openclaw status");
    process.exit(1);
  }

  // Display startup info
  console.log("========================================");
  console.log("  OpenClaw Desktop Node v2.0.0");
  console.log("========================================");
  console.log();
  console.log(`Gateway: ${config.gatewayTls ? "wss" : "ws"}://${config.gatewayHost}:${config.gatewayPort}`);
  console.log(`Name: ${config.displayName}`);
  console.log(`Shell: ${config.enableShell ? 'enabled (whitelist)' : 'disabled'}`);
  console.log(`Capabilities: screenshot, clipboard, files, ${config.enableShell ? 'shell, ' : ''}system, ui_click, ui_type, notification`);
  console.log();
  console.log("Connecting...");

  const client = new DesktopClient({
    gatewayHost: config.gatewayHost,
    gatewayPort: config.gatewayPort,
    gatewayTls: config.gatewayTls,
    gatewayToken: config.gatewayToken,
    displayName: config.displayName,
    enableShell: config.enableShell,
    allowedCommands: config.allowedCommands,
  });

  // Handle shutdown
  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    await client.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await client.stop();
    process.exit(0);
  });

  // Start client
  try {
    await client.start();
    console.log("\n✓ Connected!");
    console.log("✓ Waiting for commands...\n");
    console.log("Press Ctrl+C to stop\n");
  } catch (error) {
    console.error("\n✗ Failed to connect:", error);
    process.exit(1);
  }
}

main();
