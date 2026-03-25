import { WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const PROTOCOL_VERSION = 3;

// ============================================================================
// SECURITY CONFIGURATION
// ============================================================================

/**
 * Allowed shell commands (whitelist)
 * Only these base commands can be executed
 */
const ALLOWED_COMMANDS = new Set([
  // File system (read-only)
  'ls', 'dir', 'pwd', 'cat', 'type', 'head', 'tail', 'wc', 'find', 'tree',
  // Text processing
  'echo', 'grep', 'sed', 'awk', 'sort', 'uniq', 'cut', 'tr',
  // Development
  'node', 'npm', 'npx', 'yarn', 'pnpm', 'bun',
  'git', 'gh', 'docker', 'docker-compose',
  'python', 'python3', 'pip', 'pip3',
  'gcc', 'g++', 'make', 'cmake',
  // System info (safe)
  'whoami', 'hostname', 'date', 'uptime', 'free', 'df', 'du',
  'ps', 'top', 'htop', 'uname', 'env',
  // Network (safe queries)
  'ping', 'curl', 'wget', 'nslookup', 'dig', 'host',
  // Compression (read operations)
  'tar', 'zip', 'unzip', 'gzip', 'gunzip',
  // Process management (safe)
  'kill', 'pkill', 'pgrep', 'nice', 'renice',
]);

/**
 * Forbidden command patterns (blacklist)
 * These patterns are always blocked, even if base command is allowed
 */
const FORBIDDEN_PATTERNS = [
  // Destructive operations
  /rm\s+(-[rf]+\s+|.*\s+-[rf]+)/i,           // rm -rf
  /rm\s+\/\s*$/i,                            // rm /
  /del\s+\/[fs]/i,                           // del /f /s
  /format\s+/i,                              // format
  /mkfs/i,                                   // mkfs
  /dd\s+if=/i,                               // dd if=
  
  // Fork bombs
  /:\(\)\{.*:&.*\};:/i,                      // :(){ :& };:
  /\.\s+\/dev\/tcp/i,                        // . /dev/tcp
  
  // Privilege escalation
  /sudo\s+/i,                                // sudo
  /su\s+/i,                                  // su
  /chmod\s+[0-7]*7[0-7]{2}/i,                // chmod 777
  /chown\s+/i,                               // chown
  
  // Network attacks
  />\/dev\/tcp/i,                            // > /dev/tcp
  />\/dev\/udp/i,                            // > /dev/udp
  /nc\s+.*-e/i,                              // nc -e (reverse shell)
  /bash\s+-i/i,                              // bash -i (reverse shell)
  /sh\s+-i/i,                                // sh -i
  
  // System modification
  />.*\/etc\/passwd/i,                       // > /etc/passwd
  />.*\/etc\/shadow/i,                       // > /etc/shadow
  />.*\/etc\/sudoers/i,                      // > /etc/sudoers
  /systemctl\s+(start|stop|restart|enable|disable)/i,  // systemctl modify
  /service\s+\w+\s+(start|stop|restart)/i,  // service modify
  
  // Dangerous redirects
  />\s*\/dev\/sda/i,                         // > /dev/sda
  />\s*\/dev\/null\s+2>&1.*&/i,              // background processes
  
  // Windows specific
  /powershell.*-enc/i,                       // PowerShell encoded command
  /cmd.*\/c.*del/i,                          // cmd /c del
  /reg\s+delete/i,                           // reg delete
  /bcdedit/i,                                // bcdedit
  /format\s+[a-z]:/i,                        // format C:
];

/**
 * Maximum limits for input validation
 */
const MAX_SHELL_CMD_LENGTH = 2000;
const MAX_TEXT_LENGTH = 50000;
const MAX_FILE_PATH_LENGTH = 4096;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_COMMANDS_PER_WINDOW = 100;
const MAX_SHELL_COMMANDS_PER_WINDOW = 20;

// ============================================================================
// DEVICE IDENTITY
// ============================================================================

interface DeviceIdentity {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function derivePublicKeyRaw(publicKeyPem: string): Buffer {
  const key = crypto.createPublicKey(publicKeyPem);
  const spki = key.export({ type: "spki", format: "der" }) as Buffer;
  if (spki.length === ED25519_SPKI_PREFIX.length + 32 &&
      spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)) {
    return spki.subarray(ED25519_SPKI_PREFIX.length);
  }
  return spki;
}

function fingerprintPublicKey(publicKeyPem: string): string {
  const raw = derivePublicKeyRaw(publicKeyPem);
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateIdentity(): DeviceIdentity {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const deviceId = fingerprintPublicKey(publicKeyPem);
  return { deviceId, publicKeyPem, privateKeyPem };
}

function resolveStateDir(): string {
  return path.join(os.homedir(), ".openclaw", "state");
}

function loadOrCreateDeviceIdentity(): DeviceIdentity {
  const filePath = path.join(resolveStateDir(), "identity", "device.json");
  
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1 && parsed.deviceId && parsed.publicKeyPem && parsed.privateKeyPem) {
        return { deviceId: parsed.deviceId, publicKeyPem: parsed.publicKeyPem, privateKeyPem: parsed.privateKeyPem };
      }
    }
  } catch { /* fall through */ }

  const identity = generateIdentity();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ version: 1, ...identity, createdAtMs: Date.now() }, null, 2), { mode: 0o600 });
  return identity;
}

function signPayload(privateKeyPem: string, payload: string): string {
  const key = crypto.createPrivateKey(privateKeyPem);
  const sig = crypto.sign(null, Buffer.from(payload, "utf8"), key);
  return base64UrlEncode(sig);
}

function publicKeyRawBase64UrlFromPem(publicKeyPem: string): string {
  return base64UrlEncode(derivePublicKeyRaw(publicKeyPem));
}

// Build device auth payload for signing (v2 format)
function buildDeviceAuthPayload(params: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token: string;
  nonce: string;
}): string {
  return [
    "v2",
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(","),
    String(params.signedAtMs),
    params.token,
    params.nonce,
  ].join("|");
}

// ============================================================================
// PROTOCOL TYPES
// ============================================================================

interface RequestFrame { type: "req"; id: string; method: string; params?: unknown; }
interface ResponseFrame { type: "res"; id: string; ok: boolean; payload?: unknown; error?: { code: string; message: string }; }
interface EventFrame { type: "event"; event: string; payload?: unknown; }
type GatewayFrame = RequestFrame | ResponseFrame | EventFrame;

interface DesktopClientConfig {
  gatewayHost: string;
  gatewayPort: number;
  gatewayTls?: boolean;
  gatewayToken: string;
  displayName?: string;
  
  // Security options
  enableShell?: boolean;
  allowedCommands?: string[];
  maxShellCmdLength?: number;
}

type PendingRequest = { resolve: (value: unknown) => void; reject: (error: Error) => void; timeout: NodeJS.Timeout | null; };

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Validate input string for safety
 */
function validateInput(input: string, maxLength: number, name: string): void {
  if (typeof input !== 'string') {
    throw new SecurityError(`${name} must be a string`);
  }
  
  if (input.length > maxLength) {
    throw new SecurityError(`${name} exceeds maximum length (${maxLength} chars, got ${input.length})`);
  }
  
  // Check for null bytes (potential bypass technique)
  if (input.includes('\0')) {
    throw new SecurityError(`${name} contains null bytes`);
  }
  
  // Check for control characters (except newlines and tabs)
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(input)) {
    throw new SecurityError(`${name} contains control characters`);
  }
}

/**
 * Parse command line safely
 * Returns [command, ...args]
 */
function parseCommandLine(cmdLine: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  
  for (let i = 0; i < cmdLine.length; i++) {
    const char = cmdLine[i];
    
    if (inQuote) {
      if (char === quoteChar) {
        inQuote = false;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = true;
      quoteChar = char;
    } else if (char === ' ' || char === '\t') {
      if (current) {
        result.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    result.push(current);
  }
  
  return result;
}

/**
 * Validate shell command for safety
 */
function validateShellCommand(cmdLine: string, allowedCommands: Set<string>): void {
  validateInput(cmdLine, MAX_SHELL_CMD_LENGTH, 'Shell command');
  
  // Check for forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(cmdLine)) {
      throw new SecurityError(`Command matches forbidden pattern: ${pattern.source}`);
    }
  }
  
  // Parse command
  const parts = parseCommandLine(cmdLine);
  if (parts.length === 0) {
    throw new SecurityError('Empty command');
  }
  
  const baseCmd = path.basename(parts[0]);
  
  // Check whitelist
  if (!allowedCommands.has(baseCmd)) {
    throw new SecurityError(`Command not in whitelist: ${baseCmd}. Allowed: ${Array.from(allowedCommands).slice(0, 20).join(', ')}...`);
  }
}

/**
 * Sanitize text for display (notifications, etc.)
 */
function sanitizeDisplayText(text: string): string {
  return text
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control chars
    .substring(0, 1000); // Limit length
}

// ============================================================================
// DESKTOP CLIENT
// ============================================================================

export class DesktopClient {
  private config: DesktopClientConfig;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private pendingRequests = new Map<string, PendingRequest>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private requestTimeout = 30000;
  private deviceIdentity: DeviceIdentity;
  private connectResolve: ((value: void) => void) | null = null;
  private connectReject: ((error: Error) => void) | null = null;
  private connectId: string | null = null;
  private connectNonce: string | null = null;
  private connectTimer: NodeJS.Timeout | null = null;
  private connectSent = false;
  
  // Security
  private allowedCommands: Set<string>;
  private commandTimestamps: number[] = [];
  private shellCommandTimestamps: number[] = [];
  
  constructor(config: DesktopClientConfig) {
    this.config = config;
    this.deviceIdentity = loadOrCreateDeviceIdentity();
    
    // Initialize allowed commands
    this.allowedCommands = new Set(ALLOWED_COMMANDS);
    if (config.allowedCommands) {
      // If custom list provided, use it (but still enforce base safety)
      this.allowedCommands = new Set(config.allowedCommands);
    }
  }

  async start(): Promise<void> {
    const scheme = this.config.gatewayTls ? "wss" : "ws";
    const url = `${scheme}://${this.config.gatewayHost}:${this.config.gatewayPort}`;

    console.log(`[Desktop Client] Device ID: ${this.deviceIdentity.deviceId}`);
    console.log(`[Desktop Client] Connecting to ${url}...`);

    return new Promise((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;
      
      this.ws = new WebSocket(url, { maxPayload: 25 * 1024 * 1024 });

      this.ws.on("open", () => {
        console.log("[Desktop Client] WebSocket connected, waiting for challenge...");
        this.connectNonce = null;
        this.connectSent = false;
        this.connectTimer = setTimeout(() => {
          this.sendConnect();
        }, 750);
      });

      this.ws.on("message", (data: Buffer) => this.handleMessage(data));
      this.ws.on("close", (code, reason) => { 
        console.log(`[Desktop Client] Closed: ${code} - ${reason}`); 
        this.isConnected = false; 
        this.cleanup(); 
      });
      this.ws.on("error", (error) => { 
        console.error("[Desktop Client] Error:", error.message); 
        if (!this.isConnected) reject(error); 
      });
    });
  }

  private sendConnect(): void {
    if (this.connectSent) return;
    this.connectSent = true;
    
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const nonce = this.connectNonce ?? "";
    const signedAtMs = Date.now();
    
    const authPayload = buildDeviceAuthPayload({
      deviceId: this.deviceIdentity.deviceId,
      clientId: "node-host",
      clientMode: "node",
      role: "node",
      scopes: ["node.invoke", "node.event"],
      signedAtMs,
      token: this.config.gatewayToken,
      nonce,
    });
    const signature = signPayload(this.deviceIdentity.privateKeyPem, authPayload);

    if (nonce) {
      console.log("[Desktop Client] Sending connect with challenge nonce:", nonce.substring(0, 16) + "...");
    } else {
      console.log("[Desktop Client] Sending connect without challenge (empty nonce)...");
    }

    this.connectId = randomUUID();
    
    const params = {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: {
        id: "node-host",
        displayName: this.config.displayName || os.hostname(),
        version: "2.0.0",
        platform: process.platform,
        mode: "node",
        instanceId: randomUUID(),
      },
      caps: ["screenshot", "clipboard", "files", "shell", "system", "ui_click", "ui_type", "notification"],
      commands: ["screenshot", "clipboard", "clipboard_set", "files", "shell", "system", "ui_click", "ui_type", "notification"],
      auth: { token: this.config.gatewayToken },
      role: "node",
      scopes: ["node.invoke", "node.event"],
      device: {
        id: this.deviceIdentity.deviceId,
        publicKey: publicKeyRawBase64UrlFromPem(this.deviceIdentity.publicKeyPem),
        signature,
        signedAt: signedAtMs,
        nonce,
      },
    };

    const frame: RequestFrame = { type: "req", id: this.connectId, method: "connect", params };
    
    const timeout = setTimeout(() => {
      this.pendingRequests.delete(this.connectId!);
      if (this.connectReject) this.connectReject(new Error("Connect timeout"));
    }, this.requestTimeout);

    this.pendingRequests.set(this.connectId, {
      resolve: (value) => {
        clearTimeout(timeout);
        if (value) {
          this.isConnected = true;
          this.startHeartbeat();
          console.log("[Desktop Client] ✓ Connected!");
          if (this.connectResolve) this.connectResolve();
        }
      },
      reject: (err) => {
        clearTimeout(timeout);
        if (this.connectReject) this.connectReject(err);
      },
      timeout,
    });

    this.ws.send(JSON.stringify(frame));
  }

  private handleMessage(data: Buffer): void {
    try {
      const frame: GatewayFrame = JSON.parse(data.toString());
      if (frame.type === "res") this.handleResponse(frame);
      else if (frame.type === "req") this.handleRequest(frame);
      else if (frame.type === "event") this.handleEvent(frame);
    } catch (e) { console.error("[Desktop Client] Parse error:", e); }
  }

  private handleResponse(frame: ResponseFrame): void {
    const pending = this.pendingRequests.get(frame.id);
    if (!pending) return;
    this.pendingRequests.delete(frame.id);
    if (pending.timeout) clearTimeout(pending.timeout);
    
    if (frame.ok) {
      const payload = frame.payload as any;
      console.log("[Desktop Client] Handshake response:", payload?.server?.connId || "ok");
      pending.resolve(frame.payload);
    } else {
      const err = new Error(frame.error?.message || "Error");
      pending.reject(err);
    }
  }

  private handleEvent(frame: EventFrame): void {
    console.log(`[Desktop Client] Event: ${frame.event}`);
    
    if (frame.event === "connect.challenge" && frame.payload) {
      const challenge = frame.payload as { nonce: string; ts: number };
      console.log("[Desktop Client] Received challenge nonce:", challenge.nonce.substring(0, 16) + "...");
      this.connectNonce = challenge.nonce;
      this.sendConnect();
    }
  }

  private async handleRequest(frame: RequestFrame): Promise<void> {
    try {
      let result: unknown;
      if (frame.method === "invoke") result = await this.handleInvoke(frame.params as Record<string, unknown>);
      else if (frame.method === "ping") result = { pong: true };
      else throw new Error(`Unknown: ${frame.method}`);
      this.sendResponse(frame.id, true, result);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      const errorCode = e instanceof SecurityError ? 'SECURITY_ERROR' :
                        e instanceof RateLimitError ? 'RATE_LIMIT' : 'ERROR';
      this.sendResponse(frame.id, false, undefined, { code: errorCode, message: errorMsg });
    }
  }

  private sendResponse(id: string, ok: boolean, payload?: unknown, error?: { code: string; message: string }): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: "res", id, ok, payload, error }));
  }

  /**
   * Check rate limit for commands
   */
  private checkRateLimit(isShellCommand: boolean): void {
    const now = Date.now();
    
    // Clean old timestamps
    this.commandTimestamps = this.commandTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    this.shellCommandTimestamps = this.shellCommandTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    
    // Check general rate limit
    if (this.commandTimestamps.length >= MAX_COMMANDS_PER_WINDOW) {
      throw new RateLimitError(`Rate limit exceeded: ${MAX_COMMANDS_PER_WINDOW} commands per minute`);
    }
    
    // Check shell command rate limit
    if (isShellCommand && this.shellCommandTimestamps.length >= MAX_SHELL_COMMANDS_PER_WINDOW) {
      throw new RateLimitError(`Shell command rate limit exceeded: ${MAX_SHELL_COMMANDS_PER_WINDOW} per minute`);
    }
    
    // Record timestamp
    this.commandTimestamps.push(now);
    if (isShellCommand) {
      this.shellCommandTimestamps.push(now);
    }
  }

  private async handleInvoke(params: Record<string, unknown>): Promise<unknown> {
    const cmd = params.command as string;
    const args = (params.args as Record<string, unknown>) || {};
    
    // Check if shell is enabled
    if (cmd === 'shell' && this.config.enableShell === false) {
      throw new SecurityError('Shell commands are disabled');
    }
    
    // Check rate limit
    const isShellCommand = cmd === 'shell';
    this.checkRateLimit(isShellCommand);
    
    switch (cmd) {
      case "screenshot": return this.takeScreenshot();
      case "clipboard": return this.getClipboard();
      case "clipboard_set": return this.setClipboard(args.text as string);
      case "files": return this.handleFiles(args);
      case "shell": return this.executeShell(args.cmd as string, args.timeout as number);
      case "system": return this.getSystemInfo();
      case "ui_click": return this.clickAt(args.x as number, args.y as number, args.button as string);
      case "ui_type": return this.typeText(args.text as string);
      case "notification": return this.showNotification(args.title as string, args.body as string);
      default: throw new Error(`Unknown command: ${cmd}`);
    }
  }

  private async takeScreenshot(): Promise<{ image: string; format: string }> {
    const tempPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`);
    let cmd: string, args: string[];
    
    if (process.platform === "win32") {
      cmd = "powershell.exe";
      args = ["-ExecutionPolicy", "Bypass", "-Command", 
        `Add-Type -AssemblyName System.Windows.Forms; $b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; ` +
        `$bm=New-Object System.Drawing.Bitmap($b.Width,$b.Height); $g=[System.Drawing.Graphics]::FromImage($bm); ` +
        `$g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size); $bm.Save('${tempPath}'); $g.Dispose();$bm.Dispose()`];
    } else if (process.platform === "darwin") {
      cmd = "screencapture";
      args = ["-x", tempPath];
    } else {
      cmd = process.env.DISPLAY ? "import" : "gnome-screenshot";
      args = process.env.DISPLAY ? ["-window", "root", tempPath] : ["-f", tempPath];
    }
    
    await new Promise<void>((res, rej) => {
      const p = spawn(cmd, args, { stdio: "ignore" });
      p.on("close", c => c === 0 ? res() : rej(new Error(`Code ${c}`)));
      p.on("error", rej);
    });
    
    const buf = await fs.promises.readFile(tempPath);
    await fs.promises.unlink(tempPath).catch(() => {});
    return { image: buf.toString("base64"), format: "png" };
  }

  private async getClipboard(): Promise<{ text: string }> {
    return new Promise((res, rej) => {
      let proc: ReturnType<typeof spawn>;
      
      if (process.platform === "win32") {
        proc = spawn('powershell.exe', ['-command', 'Get-Clipboard']);
      } else if (process.platform === "darwin") {
        proc = spawn('pbpaste');
      } else {
        proc = spawn('sh', ['-c', 'xclip -selection clipboard -o 2>/dev/null || xsel --clipboard --output 2>/dev/null']);
      }
      
      let stdout = '';
      if (proc.stdout) {
        proc.stdout.on('data', (d) => stdout += d);
      }
      proc.on('close', (code) => code === 0 ? res({ text: stdout.trim() }) : rej(new Error(`Exit ${code}`)));
      proc.on('error', rej);
    });
  }

  private async setClipboard(text: string): Promise<{ success: boolean }> {
    // Validate input
    validateInput(text, MAX_TEXT_LENGTH, 'Clipboard text');
    
    return new Promise((res, rej) => {
      let proc: ReturnType<typeof spawn>;
      
      if (process.platform === "win32") {
        // Use stdin for safe input
        proc = spawn('powershell.exe', ['-command', '$input | Set-Clipboard']);
      } else if (process.platform === "darwin") {
        proc = spawn('pbcopy');
      } else {
        proc = spawn('xclip', ['-selection', 'clipboard']);
      }
      
      if (proc.stdin) {
        proc.stdin.write(text);
        proc.stdin.end();
      }
      
      proc.on('close', (code) => code === 0 ? res({ success: true }) : rej(new Error(`Exit ${code}`)));
      proc.on('error', rej);
    });
  }

  private async handleFiles(p: Record<string, unknown>): Promise<unknown> {
    const action = p.action as string;
    const fp = p.path as string;
    
    // Validate path
    validateInput(fp, MAX_FILE_PATH_LENGTH, 'File path');
    
    // Prevent path traversal
    const resolvedPath = path.resolve(fp);
    if (resolvedPath.includes('..')) {
      throw new SecurityError('Path traversal detected');
    }
    
    switch (action) {
      case "read": {
        // Check file size before reading
        const stats = await fs.promises.stat(resolvedPath);
        if (stats.size > MAX_FILE_SIZE) {
          throw new SecurityError(`File too large: ${stats.size} bytes (max ${MAX_FILE_SIZE})`);
        }
        const data = await fs.promises.readFile(resolvedPath, "utf8");
        return { path: fp, data };
      }
      
      case "write": {
        const content = p.content as string;
        validateInput(content, MAX_FILE_SIZE, 'File content');
        await fs.promises.writeFile(resolvedPath, content, "utf8");
        return { path: fp, success: true };
      }
      
      case "delete": {
        // Prevent deleting system directories
        const protectedPaths = ['/etc', '/bin', '/usr', '/lib', '/lib64', '/boot', '/dev', '/proc', '/sys'];
        for (const protectedPath of protectedPaths) {
          if (resolvedPath.startsWith(protectedPath)) {
            throw new SecurityError(`Cannot delete system directory: ${protectedPath}`);
          }
        }
        await fs.promises.unlink(resolvedPath);
        return { path: fp, success: true };
      }
      
      case "list": {
        const entries = await fs.promises.readdir(resolvedPath);
        return { path: fp, entries };
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async executeShell(cmdLine: string, timeout = 30000): Promise<unknown> {
    // Validate command
    validateShellCommand(cmdLine, this.allowedCommands);
    
    // Parse command safely
    const parts = parseCommandLine(cmdLine);
    if (parts.length === 0) {
      throw new SecurityError('Empty command');
    }
    
    const [cmd, ...args] = parts;
    
    return new Promise((res) => {
      const proc = spawn(cmd, args, {
        timeout,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false, // Don't use shell - safer
      });
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (d) => {
        stdout += d;
        // Limit output size
        if (stdout.length > MAX_FILE_SIZE) {
          proc.kill();
        }
      });
      
      proc.stderr.on('data', (d) => {
        stderr += d;
        if (stderr.length > MAX_FILE_SIZE) {
          proc.kill();
        }
      });
      
      proc.on('close', (code) => {
        res({
          stdout: stdout.substring(0, MAX_FILE_SIZE),
          stderr: stderr.substring(0, MAX_FILE_SIZE),
          exitCode: code ?? 0,
          timedOut: proc.killed
        });
      });
      
      proc.on('error', (err) => {
        res({
          stdout: '',
          stderr: err.message,
          exitCode: 1,
          timedOut: false
        });
      });
    });
  }

  private async getSystemInfo(): Promise<unknown> {
    const cpus = os.cpus();
    const total = os.totalmem();
    const free = os.freemem();
    
    return {
      platform: process.platform,
      hostname: os.hostname(),
      cpuCount: cpus.length,
      cpuModel: cpus[0]?.model || "unknown",
      totalMemory: total,
      freeMemory: free,
      memoryUsage: ((total - free) / total) * 100,
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      networkInterfaces: Object.keys(os.networkInterfaces() || {}),
      nodeVersion: process.version,
      clientVersion: "2.0.0"
    };
  }

  private async clickAt(x: number, y: number, button = "left"): Promise<{ success: boolean }> {
    // Validate coordinates
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new SecurityError('Invalid coordinates');
    }
    
    // Clamp to reasonable values
    x = Math.max(0, Math.min(10000, Math.floor(x)));
    y = Math.max(0, Math.min(10000, Math.floor(y)));
    
    return new Promise((res, rej) => {
      let proc: ReturnType<typeof spawn>;
      
      if (process.platform === "win32") {
        proc = spawn('powershell.exe', [
          '-command',
          `Add-Type -AssemblyName System.Windows.Forms; ` +
          `[System.Windows.Forms.Cursor]::Position=New-Object System.Drawing.Point(${x},${y}); ` +
          `Start-Sleep -Milliseconds 50; ` +
          `Add-Type -MemberDefinition '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int,int,int,int,int);' -Name U32 -Namespace W; ` +
          `[W.U32]::mouse_event(0x02,0,0,0,0);[W.U32]::mouse_event(0x04,0,0,0,0)`
        ]);
      } else if (process.platform === "linux") {
        proc = spawn('xdotool', ['mousemove', String(x), String(y), 'click', button === "right" ? "3" : "1"]);
      } else {
        proc = spawn('cliclick', [`c:${x},${y}`]);
      }
      
      proc.on('close', (code) => code === 0 ? res({ success: true }) : rej(new Error(`Exit ${code}`)));
      proc.on('error', rej);
    });
  }

  private async typeText(text: string): Promise<{ success: boolean }> {
    // Validate input
    validateInput(text, MAX_TEXT_LENGTH, 'Text to type');
    
    return new Promise((res, rej) => {
      let proc: ReturnType<typeof spawn>;
      
      if (process.platform === "win32") {
        // Use stdin for safety
        proc = spawn('powershell.exe', [
          '-command',
          `$input | ForEach-Object { [System.Windows.Forms.SendKeys]::SendWait($_) }`
        ]);
        if (proc.stdin) {
          proc.stdin.write(text);
          proc.stdin.end();
        }
      } else if (process.platform === "linux") {
        proc = spawn('xdotool', ['type', '--file', '-']);
        if (proc.stdin) {
          proc.stdin.write(text);
          proc.stdin.end();
        }
      } else {
        // macOS - use osascript with stdin
        proc = spawn('osascript', ['-e', 'tell application "System Events" to keystroke (do shell script "cat")']);
        // This is a limitation - osascript doesn't easily support stdin
        // For now, use a temp file approach
        const tempFile = path.join(os.tmpdir(), `type-text-${Date.now()}.txt`);
        fs.writeFileSync(tempFile, text, { mode: 0o600 });
        proc = spawn('osascript', ['-e', `tell application "System Events" to keystroke (read (POSIX file "${tempFile}") as string)`]);
        proc.on('close', () => {
          fs.unlinkSync(tempFile);
        });
      }
      
      proc.on('close', (code) => code === 0 ? res({ success: true }) : rej(new Error(`Exit ${code}`)));
      proc.on('error', rej);
    });
  }

  private async showNotification(title: string, body: string): Promise<{ success: boolean }> {
    // Sanitize display text
    title = sanitizeDisplayText(title);
    body = sanitizeDisplayText(body);
    
    return new Promise((res, rej) => {
      let proc: ReturnType<typeof spawn>;
      
      if (process.platform === "win32") {
        // Use PowerShell with proper XML escaping
        const escapedTitle = title.replace(/[<>&'"]/g, (c) => ({
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          "'": '&apos;',
          '"': '&quot;'
        }[c] || c));
        
        const escapedBody = body.replace(/[<>&'"]/g, (c) => ({
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          "'": '&apos;',
          '"': '&quot;'
        }[c] || c));
        
        proc = spawn('powershell.exe', [
          '-command',
          `[Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime]|Out-Null; ` +
          `$t='<toast><visual><binding template="ToastText02"><text id="1">${escapedTitle}</text><text id="2">${escapedBody}</text></binding></visual></toast>'; ` +
          `$x=New-Object Windows.Data.Xml.Dom.XmlDocument; $x.LoadXml($t); ` +
          `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('OpenClaw').Show([Windows.UI.Notifications.ToastNotification]::new($x))`
        ]);
      } else if (process.platform === "darwin") {
        proc = spawn('osascript', ['-e', `display notification "${body.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"`]);
      } else {
        proc = spawn('notify-send', [title, body]);
      }
      
      proc.on('close', (code) => code === 0 ? res({ success: true }) : rej(new Error(`Exit ${code}`)));
      proc.on('error', rej);
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        console.log("[Desktop Client] Heartbeat OK");
      }
    }, 60000);
  }

  private cleanup(): void {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.pendingRequests.forEach(p => {
      if (p.timeout) clearTimeout(p.timeout);
      p.reject(new Error("Closed"));
    });
    this.pendingRequests.clear();
  }

  async stop(): Promise<void> {
    this.isConnected = false;
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    console.log("[Desktop Client] Stopped");
  }
}
