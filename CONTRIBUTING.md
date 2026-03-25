# Contributing to OpenClaw Desktop Client

First off, thank you for considering contributing to OpenClaw Desktop Client! It's people like you that make OpenClaw such a great tool.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Security](#security)

---

## 📜 Code of Conduct

This project and everyone participating in it is governed by the OpenClaw Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to conduct@openclaw.ai.

---

## 🤝 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed and expected**
- **Include screenshots or animated GIFs if possible**
- **Include your environment details** (OS, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and expected behavior**
- **Explain why this enhancement would be useful**
- **List some other applications where this exists**

### Pull Requests

- Fill in the required template
- Do not include issue numbers in the PR title
- Include screenshots and animated GIFs in your pull request whenever possible
- Follow the coding standards
- Include tests for new features
- Update documentation for changes

---

## 🛠️ Development Setup

### Prerequisites

- Node.js 22+ or Node.js 24+ (recommended)
- npm, pnpm, or bun
- Git
- TypeScript knowledge

### Setup Steps

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/OpenClaw-Desktop.git
   cd OpenClaw-Desktop
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Compile TypeScript**
   ```bash
   npm run compile
   ```

5. **Run tests**
   ```bash
   node test-security.js
   ```

6. **Create a branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

### Development Workflow

1. Make your changes
2. Test your changes
3. Commit your changes
4. Push to your fork
5. Create a Pull Request

---

## 📏 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Use proper type annotations
- Avoid `any` types when possible
- Use interfaces for object shapes

### Code Style

```typescript
// ✅ Good
interface ClientConfig {
  gatewayHost: string;
  gatewayPort: number;
  gatewayToken: string;
}

class DesktopClient {
  private config: ClientConfig;
  
  constructor(config: ClientConfig) {
    this.config = config;
  }
  
  async start(): Promise<void> {
    // Implementation
  }
}

// ❌ Bad
class DesktopClient {
  constructor(config: any) {
    this.config = config;
  }
  
  start() {
    // Implementation
  }
}
```

### Security Guidelines

- **Never commit sensitive data** (tokens, passwords, IP addresses)
- **Always validate user input**
- **Use environment variables for secrets**
- **Follow the principle of least privilege**
- **Add security tests for new features**

### File Naming

- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces
- Use kebab-case for file names (except TypeScript files)
- Use UPPERCASE for constants

### Comments

```typescript
/**
 * Validates a shell command against the whitelist
 * @param cmdLine - The command line to validate
 * @param allowedCommands - Set of allowed commands
 * @throws SecurityError if command is not allowed
 */
function validateShellCommand(
  cmdLine: string,
  allowedCommands: Set<string>
): void {
  // Implementation
}
```

---

## 📝 Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change without fix or feature
- `perf`: Performance improvement
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

### Examples

```
feat(security): add command whitelist validation

- Add 60+ safe commands to whitelist
- Block dangerous patterns
- Add security tests

Closes #123
```

```
fix(cli): prevent token exposure in process list

- Deprecate --token CLI argument
- Add warning message
- Update documentation

Fixes #456
```

---

## 🔄 Pull Request Process

### Before Submitting

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Run existing tests** to ensure nothing broke
4. **Check code style** with linter
5. **Update CHANGELOG.md** if applicable

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests passing

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No sensitive data included
```

### Review Process

1. At least 1 approval required
2. All CI checks must pass
3. No merge conflicts
4. Documentation must be updated

---

## 🔒 Security

### Reporting Security Issues

**DO NOT** open a public issue for security vulnerabilities.

Instead, please report them privately:

1. Email: security@openclaw.ai
2. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Security Review

All PRs that touch security-related code will undergo additional review:

- Command execution
- File operations
- Input validation
- Authentication
- Network communication

### Security Best Practices

- Never commit sensitive data
- Use environment variables
- Validate all inputs
- Follow least privilege principle
- Keep dependencies updated

---

## 🧪 Testing

### Running Tests

```bash
# Security tests
node test-security.js

# Unit tests (when available)
npm test

# Integration tests (when available)
npm run test:integration
```

### Writing Tests

```javascript
// test-security.js example
test('Should block dangerous commands', () => {
  const client = new MockDesktopClient({});
  assert.throws(() => {
    client.validateShellCommand('rm -rf /');
  }, /forbidden pattern/i);
});
```

### Test Coverage

We aim for:
- 90%+ code coverage
- 100% security feature coverage
- All edge cases tested

---

## 📚 Documentation

### What to Document

- New features
- API changes
- Configuration options
- Platform-specific notes
- Security considerations

### Documentation Style

- Use clear, simple language
- Include code examples
- Add screenshots/GIFs when helpful
- Keep it up-to-date

---

## 🏷️ Release Process

1. Update CHANGELOG.md
2. Update version in package.json
3. Create git tag
4. Build release artifacts
5. Create GitHub release
6. Publish to npm (if applicable)

---

## 📞 Getting Help

- **Documentation:** [README.md](./README.md)
- **Issues:** https://github.com/xuviga/OpenClaw-Desktop/issues
- **Discord:** https://discord.com/invite/clawd
- **Email:** support@openclaw.ai

---

## 🙏 Recognition

Contributors are recognized in:
- GitHub contributors list
- CHANGELOG.md
- Release notes
- README.md (major contributors)

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to OpenClaw Desktop Client! 🎉
