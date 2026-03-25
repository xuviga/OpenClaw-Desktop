# Сборка Windows MSI установщика

## Быстрая сборка на Windows

1. Скопируй папку `desktop` на Windows машину
2. Дважды кликни `build-windows.bat`
3. Готовые файлы будут в папке `release/`:
   - `OpenClaw Desktop-1.0.0-win-x64.exe` (NSIS установщик)
   - `OpenClaw Desktop-1.0.0-win-x64.msi` (MSI установщик)
   - `OpenClaw Desktop-1.0.0-portable.exe` (Portable)

## Ручная сборка

```cmd
# Установить зависимости
npm install

# Собрать TypeScript
npm run compile

# Собрать Windows установщики
npm run build:win
```

## Что генерируется

| Файл | Описание | Размер |
|------|----------|--------|
| `.exe` (NSIS) | Полноценный установщик с деинсталлятором | ~80MB |
| `.msi` | MSI пакет для корпоративного развёртывания | ~80MB |
| `-portable.exe` | Портативная версия, не требует установки | ~80MB |

## Требования для сборки

- Windows 10/11 x64
- Node.js 18+ LTS
- ~500MB свободного места

## Кастомизация

### Изменить иконку
Замени `assets/icon.png` на свою (256x256 PNG)

### Изменить название
Отредактируй `package.json`:
```json
{
  "productName": "Твоё Название",
  "build": {
    "win": {
      "shortcutName": "Твоё Название"
    }
  }
}
```

### Изменить версию
Отредактируй `package.json`:
```json
{
  "version": "1.2.3"
}
```

## Сборка на Linux/macOS

```bash
# Установить зависимости
npm install

# Собрать TypeScript
npm run compile

# Собрать для Windows (требует Wine)
npm run build:win

# Или собрать для текущей платформы
npm run build        # Текущая ОС
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## GitHub Actions (автосборка)

Создай `.github/workflows/build.yml`:

```yaml
name: Build Desktop Client

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run compile
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.os }}-build
          path: release/
```

## Структура проекта

```
desktop/
├── assets/              # Иконки
│   ├── icon.png
│   └── icon.svg
├── build/               # Build конфиги
│   └── entitlements.mac.plist
├── dist/                # Скомпилированный TS
├── renderer/            # UI
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── src/                 # TypeScript source
│   ├── client.ts
│   ├── cli.ts
│   └── pairing.ts
├── main.js              # Electron main process
├── preload.js           # Electron preload
├── package.json         # npm конфиг
├── tsconfig.json        # TypeScript конфиг
├── build-windows.bat    # Сборка на Windows
├── install.sh           # Установка на Linux/macOS
└── start.sh             # Запуск в dev режиме
```

## Troubleshooting

### "electron-builder not found"
```cmd
npm install electron-builder --save-dev
```

### "Cannot find module 'electron'"
```cmd
npm install electron --save-dev
```

### MSI не создаётся
Установи WiX Toolset:
```cmd
choco install wixtoolset
```

### Ошибка при сборке на Linux для Windows
```bash
# Установить Wine
sudo apt install wine64

# Или собирать только для Linux
npm run build:linux
```
