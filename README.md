# OpenClaw Desktop Client

✅ **SECURE** standalone клиент для удалённого управления ПК через OpenClaw Gateway.

**Version:** 2.0.0 (Security Hardened)
**Updated:** 2026-03-25
**Platforms:** Windows, Linux, macOS

---

## 📋 Содержание

- [Особенности](#особенности)
- [Безопасность](#безопасность)
- [Установка](#установка)
  - [Windows](#windows)
  - [Linux](#linux)
  - [macOS](#macos)
- [Конфигурация](#конфигурация)
- [Использование](#использование)
- [Команды](#команды)
- [Примеры](#примеры)
- [Troubleshooting](#troubleshooting)
- [API](#api)
- [Разработка](#разработка)

---

## 🌟 Особенности

- ✅ **Кроссплатформенность** - Windows, Linux, macOS
- ✅ **Безопасность** - Command whitelist, input validation, rate limiting
- ✅ **Standalone** - Не требует установки OpenClaw
- ✅ **Правильный протокол** - OpenClaw Gateway v3
- ✅ **Device Identity** - ED25519 ключи для аутентификации
- ✅ **Полный контроль** - Скриншоты, буфер обмена, файлы, shell, UI automation

---

## 🔒 Безопасность (v2.0)

### Защита от атак

| Угроза | Защита | Статус |
|--------|--------|--------|
| **RCE (Remote Code Execution)** | Command whitelist + blacklist | ✅ |
| **Shell Injection** | spawn() вместо exec() | ✅ |
| **PowerShell Injection** | stdin для данных | ✅ |
| **Path Traversal** | Валидация путей | ✅ |
| **Token Theft** | Env vars вместо CLI args | ✅ |
| **DoS** | Rate limiting | ✅ |

### Whitelist команд

**Разрешено (60+ команд):**
```
# Файловая система (чтение)
ls, dir, pwd, cat, type, head, tail, wc, find, tree

# Текстовая обработка
echo, grep, sed, awk, sort, uniq, cut, tr

# Разработка
node, npm, npx, yarn, pnpm, bun
git, gh, docker, docker-compose
python, python3, pip, pip3
gcc, g++, make, cmake

# Системная информация
whoami, hostname, date, uptime, free, df, du
ps, top, htop, uname, env

# Сеть (безопасные запросы)
ping, curl, wget, nslookup, dig, host

# Архивация
tar, zip, unzip, gzip, gunzip

# Управление процессами
kill, pkill, pgrep, nice, renice
```

**Запрещено (автоматически блокируется):**
```
rm -rf /           # Удаление системы
del /f /s          # Windows удаление
format C:          # Форматирование
sudo, su           # Повышение привилегий
chmod 777          # Небезопасные права
nc -e              # Reverse shell
bash -i            # Reverse shell
:(){ :& };:        # Fork bomb
```

### Rate Limiting

- **Общий лимит:** 100 команд/мин
- **Shell команды:** 20 команд/мин

### Защищённые директории

Нельзя удалить через `files delete`:
- `/etc`, `/bin`, `/usr`, `/lib`, `/lib64`
- `/boot`, `/dev`, `/proc`, `/sys`
- `C:\Windows`, `C:\Program Files`

---

## 📥 Установка

### Windows

#### Способ 1: Скачать архив

```powershell
# 1. Скачать с GitHub Releases
# https://github.com/xuviga/OpenClaw-Desktop/releases

# 2. Распаковать (используйте 7-Zip или WinRAR)
# Или через PowerShell:
tar -xzf desktop-client.tar.gz
cd desktop

# 3. Установить зависимости
npm install

# 4. Скомпилировать
npm run compile
```

#### Зависимости Windows

Клиент использует встроенные средства Windows:
- **PowerShell 5.1+** (встроен)
- **.NET Framework** (встроен)

Для UI automation ничего дополнительно не требуется.

---

### Linux

#### Способ 1: Скачать архив

```bash
# 1. Скачать с GitHub Releases
wget https://github.com/xuviga/OpenClaw-Desktop/releases/download/v2.0.0/desktop-client.tar.gz

# 2. Распаковать
tar -xzf desktop-client.tar.gz
cd desktop

# 3. Установить
npm install && npm run compile
```

#### Зависимости Linux

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y \
  xdotool          # UI automation
  xclip            # Clipboard
  gnome-screenshot # Screenshots (или imagemagick)
  libnotify-bin    # Notifications

# Fedora/RHEL
sudo dnf install -y \
  xdotool \
  xclip \
  gnome-screenshot \
  libnotify

# Arch Linux
sudo pacman -S \
  xdotool \
  xclip \
  gnome-screenshot \
  libnotify
```

---

### macOS

#### Способ 1: Скачать архив

```bash
# 1. Скачать с GitHub Releases
curl -O -L https://github.com/xuviga/OpenClaw-Desktop/releases/download/v2.0.0/desktop-client.tar.gz

# 2. Распаковать
tar -xzf desktop-client.tar.gz
cd desktop

# 3. Установить
npm install && npm run compile
```

#### Зависимости macOS

```bash
# UI automation (требуется для кликов)
brew install cliclick
```

---

## ⚙️ Конфигурация

### Способ 1: Переменные окружения (РЕКОМЕНДУЕТСЯ)

**Windows (PowerShell):**
```powershell
# Установить переменную (текущая сессия)
$env:GATEWAY_TOKEN="your-token-here"

# Постоянно (пользователь)
[Environment]::SetEnvironmentVariable("GATEWAY_TOKEN", "your-token-here", "User")

# Запуск
node dist\cli.js --host your-gateway.com --port 18789
```

**Linux/macOS (Bash/Zsh):**
```bash
# Текущая сессия
export GATEWAY_TOKEN="your-token-here"

# Постоянно (добавить в ~/.bashrc или ~/.zshrc)
echo 'export GATEWAY_TOKEN="your-token-here"' >> ~/.bashrc
source ~/.bashrc

# Запуск
node dist/cli.js --host your-gateway.com --port 18789
```

### Способ 2: Config файл

**Windows:**
```powershell
# Создать директорию
mkdir $env:USERPROFILE\.openclaw

# Создать конфиг
copy desktop-config.example.json $env:USERPROFILE\.openclaw\desktop-config.json

# Редактировать
notepad $env:USERPROFILE\.openclaw\desktop-config.json

# Запуск (автоматически найдёт конфиг)
node dist\cli.js
```

**Linux/macOS:**
```bash
# Создать директорию
mkdir -p ~/.openclaw

# Создать конфиг
cp desktop-config.example.json ~/.openclaw/desktop-config.json

# Редактировать
nano ~/.openclaw/desktop-config.json

# Запуск (автоматически найдёт конфиг)
node dist/cli.js
```

**Формат конфига:**
```json
{
  "gatewayHost": "your-gateway.com",
  "gatewayPort": 18789,
  "gatewayTls": false,
  "gatewayToken": "your-token-here",
  "displayName": "MyPC",
  "enableShell": true,
  "allowedCommands": [
    "ls", "cat", "grep", "git", "node", "npm"
  ]
}
```

---

## 🚀 Использование

### Базовый запуск

**Windows (PowerShell):**
```powershell
# Установить токен
$env:GATEWAY_TOKEN="your-token-here"

# Запуск
node dist\cli.js --host your-gateway.com --port 18789

# С именем устройства
$env:DISPLAY_NAME="WorkPC"
node dist\cli.js --host your-gateway.com

# Отключить shell команды
node dist\cli.js --host your-gateway.com --disable-shell
```

**Linux/macOS:**
```bash
# Установить токен
export GATEWAY_TOKEN="your-token-here"

# Запуск
node dist/cli.js --host your-gateway.com --port 18789

# С именем устройства
DISPLAY_NAME="WorkPC" node dist/cli.js --host your-gateway.com

# Отключить shell команды
OPENCLAW_DISABLE_SHELL=1 node dist/cli.js --host your-gateway.com
```

### Все опции CLI

```bash
node dist/cli.js [options]

Options:
  --host <host>           Gateway host (default: 127.0.0.1)
  --port <port>           Gateway port (default: 18789)
  --config <path>         Config file path
  --name <name>           Display name for this device
  --tls                   Use TLS (wss://)
  --disable-shell         Disable shell commands
  --help                  Show help

Environment Variables:
  GATEWAY_HOST            Gateway host
  GATEWAY_PORT            Gateway port
  GATEWAY_TLS             Use TLS (true/false)
  GATEWAY_TOKEN           Auth token (SECURE)
  DISPLAY_NAME            Display name
  OPENCLAW_DISABLE_SHELL  Disable shell (1/true)
```

---

## 📋 Команды

| Команда | Описание | Платформы |
|---------|----------|-----------|
| `screenshot` | Скриншот экрана | All |
| `clipboard` | Прочитать буфер обмена | All |
| `clipboard_set` | Записать в буфер | All |
| `files` | Работа с файлами | All |
| `shell` | Выполнить команду | All (whitelist) |
| `system` | Системная информация | All |
| `ui_click` | Клик по координатам | All |
| `ui_type` | Ввод текста | All |
| `notification` | Уведомление | All |

---

## 🔒 Best Practices

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

---

## 🔧 Troubleshooting

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

## 📚 API

### DesktopClient Class

```typescript
import { DesktopClient } from '@openclaw/desktop-client';

const client = new DesktopClient({
  gatewayHost: 'your-gateway.com',
  gatewayPort: 18789,
  gatewayTls: false,
  gatewayToken: 'your-token',
  displayName: 'MyPC',
  enableShell: true,
  allowedCommands: ['ls', 'cat', 'git']
});

// Запуск
await client.start();

// Остановка
await client.stop();
```

---

## 👨‍💻 Разработка

### Сборка

```bash
# Установить зависимости
npm install

# Компиляция TypeScript
npm run compile

# Запуск в dev режиме
node dist/cli.js --host HOST --port PORT

# Создать архив
tar -czf desktop-client.tar.gz \
  package.json package-lock.json tsconfig.json \
  dist/ src/ *.md *.sh *.ps1 *.bat *.example.json
```

### Тестирование

```bash
# Запуск security тестов
node test-security.js

# Результат
🧪 OpenClaw Desktop Client Security Tests
✅ Passed: 14
❌ Failed: 0
📈 Success Rate: 100.0%
```

---

## 📄 Лицензия

MIT

---

## 🆘 Поддержка

- **Документация:** [SECURITY.md](./SECURITY.md) | [QUICKSTART.md](./QUICKSTART.md)
- **Issues:** https://github.com/xuviga/OpenClaw-Desktop/issues
- **Discord:** https://discord.com/invite/clawd
- **Email:** support@openclaw.ai

---

## 📊 Changelog

### v2.0.0 (2026-03-25)
- ✅ Security hardening (whitelist, blacklist, rate limiting)
- ✅ Token protection via env vars
- ✅ Input validation
- ✅ spawn() instead of exec()
- ✅ stdin for sensitive data
- ✅ 14 security tests
- ✅ Comprehensive documentation

### v1.0.0 (2026-03-23)
- Initial release
- Basic functionality
- ⚠️ Security issues (fixed in v2.0)

---

**Made with ❤️ by OpenClaw Team**
