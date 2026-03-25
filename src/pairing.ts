import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomBytes } from "node:crypto";

const CONFIG_DIR = path.join(os.homedir(), ".openclaw", "desktop");
const PAIRING_FILE = path.join(CONFIG_DIR, "pairing.json");

export interface PairingConfig {
  setupCode: string;
  gatewayUrl: string;
  gatewayToken?: string;
  nodeId: string;
  displayName: string;
  capabilities: string[];
  expiresAt: number;
  createdAt: number;
}

export interface PairingResult {
  success: boolean;
  setupCode?: string;
  gatewayUrl?: string;
  nodeId?: string;
  error?: string;
}

export function generateSetupCode(
  gatewayUrl: string,
  gatewayToken?: string,
  nodeId?: string,
  displayName?: string,
  capabilities?: string[],
): PairingConfig {
  const code = randomBytes(32).toString("base64url");
  const id = nodeId || randomBytes(16).toString("hex");
  const name = displayName || os.hostname() || "Desktop";

  const config: PairingConfig = {
    setupCode: code,
    gatewayUrl,
    gatewayToken,
    nodeId: id,
    displayName: name,
    capabilities: capabilities || [
      "screenshot",
      "clipboard",
      "files",
      "shell",
      "system",
      "ui_click",
      "ui_type",
      "notification",
    ],
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    createdAt: Date.now(),
  };

  // Save pairing config
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(PAIRING_FILE, JSON.stringify(config, null, 2));

  return config;
}

export function loadPairingConfig(): PairingConfig | null {
  if (!fs.existsSync(PAIRING_FILE)) {
    return null;
  }

  try {
    const config = JSON.parse(fs.readFileSync(PAIRING_FILE, "utf8"));

    // Check if expired
    if (config.expiresAt && Date.now() > config.expiresAt) {
      fs.unlinkSync(PAIRING_FILE);
      return null;
    }

    return config;
  } catch {
    return null;
  }
}

export function clearPairingConfig(): void {
  if (fs.existsSync(PAIRING_FILE)) {
    fs.unlinkSync(PAIRING_FILE);
  }
}

export function formatSetupCode(config: PairingConfig): string {
  const lines = [
    "╔════════════════════════════════════════════════════════════╗",
    "║          OpenClaw Desktop Pairing Code                     ║",
    "╠════════════════════════════════════════════════════════════╣",
    "",
    `  Setup Code: ${config.setupCode}`,
    "",
    `  Gateway: ${config.gatewayUrl}`,
    `  Node ID: ${config.nodeId}`,
    `  Name: ${config.displayName}`,
    "",
    `  Expires: ${new Date(config.expiresAt).toLocaleString()}`,
    "",
    "╠════════════════════════════════════════════════════════════╣",
    "║  Instructions:                                             ║",
    "║  1. Copy the setup code above                              ║",
    "║  2. Open OpenClaw (Telegram or Web)                        ║",
    "║  3. Send: /pair                                            ║",
    "║  4. Paste the setup code when prompted                     ║",
    "╚════════════════════════════════════════════════════════════╝",
  ];

  return lines.join("\n");
}

export function formatCompactSetupCode(config: PairingConfig): string {
  const payload = {
    url: config.gatewayUrl,
    token: config.gatewayToken,
    nodeId: config.nodeId,
    displayName: config.displayName,
    capabilities: config.capabilities,
    exp: config.expiresAt,
  };

  const json = JSON.stringify(payload);
  const base64 = Buffer.from(json).toString("base64url");
  return base64;
}

export function parseCompactSetupCode(code: string): PairingConfig | null {
  try {
    const json = Buffer.from(code, "base64url").toString("utf8");
    const payload = JSON.parse(json);

    return {
      setupCode: code,
      gatewayUrl: payload.url,
      gatewayToken: payload.token,
      nodeId: payload.nodeId,
      displayName: payload.displayName,
      capabilities: payload.capabilities,
      expiresAt: payload.exp,
      createdAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// CLI for generating pairing codes
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: node dist/pairing.js [options]

Options:
  --host <host>       Gateway host (default: 127.0.0.1)
  --port <port>       Gateway port (default: 18789)
  --tls               Use TLS (wss://)
  --token <token>     Gateway token
  --name <name>       Display name
  --compact           Output compact setup code only
  --status            Show current pairing status
  --clear             Clear pairing config

Examples:
  node dist/pairing.js --host 192.168.1.100 --port 18789
  node dist/pairing.js --host example.com --port 443 --tls --token abc123
  node dist/pairing.js --status
`);
    process.exit(0);
  }

  if (args.includes("--status")) {
    const config = loadPairingConfig();
    if (config) {
      console.log(formatSetupCode(config));
    } else {
      console.log("No active pairing config found.");
    }
    process.exit(0);
  }

  if (args.includes("--clear")) {
    clearPairingConfig();
    console.log("Pairing config cleared.");
    process.exit(0);
  }

  // Parse args
  let host = "127.0.0.1";
  let port = 18789;
  let tls = false;
  let token: string | undefined;
  let name: string | undefined;
  let compact = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--host":
        host = args[++i];
        break;
      case "--port":
        port = parseInt(args[++i], 10);
        break;
      case "--tls":
        tls = true;
        break;
      case "--token":
        token = args[++i];
        break;
      case "--name":
        name = args[++i];
        break;
      case "--compact":
        compact = true;
        break;
    }
  }

  const scheme = tls ? "wss" : "ws";
  const gatewayUrl = `${scheme}://${host}:${port}`;

  const config = generateSetupCode(gatewayUrl, token, undefined, name);

  if (compact) {
    console.log(formatCompactSetupCode(config));
  } else {
    console.log(formatSetupCode(config));
  }
}
