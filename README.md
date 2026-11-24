# Muse Desktop (Electron)

A cross-platform Electron desktop client for **Muse** — the personal AI assistant by Meta (Facebook).

---

## 📌 Overview

**Muse** is an intelligent personal AI assistant built to streamline daily workflows, carry out multi-step tasks, summarize content, and assist across productivity and communication channels.

This project packages Muse into a native desktop experience using [Electron](https://www.electronjs.org/), bringing quick hotkey access, system tray integration, persistent sessions, and desktop multitasking to your AI assistant workflow.

---

## 💡 Why Build This?

> *"Because Chrome already has way too much going on."*

Modern web browsers like Google Chrome have become overcrowded with dozens (or hundreds) of open tabs, heavy extensions, background tasks, and endless clutter. Using your primary AI assistant inside an already overloaded browser comes with real friction:

- **Lost in Tab Hell**: Your assistant gets buried under countless tabs, docs, and search results.
- **Resource Competition**: Chrome is already notorious for heavy RAM and CPU consumption; running persistent AI tools inside it only adds to memory bloat.
- **Context Switching**: Having to hunt down the right browser window or tab breaks your flow while coding, writing, or working in other desktop applications.
- **A Dedicated Workspace**: A standalone Electron app provides a lightweight, focused, single-purpose home for Muse—accessible via a single global hotkey, pinned always-on-top, or tucked neatly into the system tray without competing with browser sessions.

---

## ✨ Features

- **Global Quick-Toggle Shortcut**: Summon or hide Muse anywhere on your system via `Alt+Space` (falls back to `Ctrl+Shift+M` / `Cmd+Shift+M` if already claimed).
- **Always-on-Top Mode**: Keep Muse floating above your active editor, terminal, or workspace (`Ctrl+Shift+T` / `Cmd+Shift+T`).
- **System Tray Persistence**: Runs quietly in the tray (`Minimize to Tray on Close` enabled by default) with quick show/hide, home, reload, and quit controls.
- **Persistent Login & Auth Popups**: Uses a dedicated `persist:muse` session partition and supports in-app Meta/Facebook OAuth popups while opening external links in your default browser.
- **Window State & Zoom Memory**: Automatically remembers window size, position (validated against active displays), maximized state, and zoom level.
- **Native Context Menu & Offline Fallback**: Includes spellcheck suggestions, link copying, navigation controls, and a clean offline recovery screen with automatic reconnect.

---

## 🛠️ Tech Stack

- **Runtime**: Electron + Node.js
- **Language**: TypeScript (strict mode, CommonJS output)
- **Packaging**: `electron-builder` (NSIS/Portable for Windows, DMG for macOS, AppImage/DEB for Linux)
- **Storage**: Built-in JSON settings store in Electron `userData` (`config.json`) — zero runtime npm dependencies

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.x, v20+, or v26+)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Vector-Networks/Muse-Electron.git
   cd Muse-Electron
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   *(On Windows PowerShell, use `npm.cmd install` if script execution policy restricts `npm.ps1`.)*

3. **Configure Environment (Optional):**
   Copy `.env.example` to `.env` if you want to customize the target URL or global shortcut:
   ```env
   MUSE_APP_URL=https://muse.ai
   MUSE_SHORTCUT=Alt+Space
   ```

4. **Launch in Development:**
   ```bash
   npm run dev
   ```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Alt + Space` | Global show / hide Muse (fallback: `Ctrl/Cmd + Shift + M`) |
| `Ctrl/Cmd + Shift + T` | Toggle Always on Top |
| `Ctrl/Cmd + Shift + H` | Go to Muse Home |
| `Ctrl/Cmd + R` | Reload |
| `Ctrl/Cmd + Shift + R` | Force Reload |
| `Ctrl/Cmd + =` / `-` / `0` | Zoom In / Zoom Out / Reset Zoom |
| `Alt + Left` / `Right` | Back / Forward |
| `F11` | Toggle Fullscreen |
| `Ctrl/Cmd + Shift + I` | Toggle Developer Tools |
| `Ctrl/Cmd + Q` | Quit Muse Desktop |

---

## 📦 Project Structure

```text
Muse-Electron/
├── assets/
│   ├── icon.ico              # Windows multi-resolution app icon
│   ├── icon.png              # 256x256 app icon
│   └── tray.png              # 32x32 system tray icon
├── scripts/
│   ├── copy-renderer.mjs     # Copies static renderer files to dist/renderer
│   └── generate-icons.mjs    # Generates PNG/ICO icon assets
├── src/
│   ├── main/                 # Electron main process
│   │   ├── config.ts         # App constants, .env loader, URL/UA security helpers
│   │   ├── index.ts          # App lifecycle, single-instance lock, IPC, smoke test
│   │   ├── menu.ts           # Native application menu bar
│   │   ├── shortcuts.ts      # Global shortcut registration with fallback
│   │   ├── store.ts          # Typed JSON settings store & safe display bounds
│   │   ├── tray.ts           # System tray icon and context menu
│   │   └── window.ts         # BrowserWindow, OAuth/external routing, context menu
│   ├── preload/
│   │   └── index.ts          # Secure contextBridge API (window.museDesktop)
│   └── renderer/
│       └── offline.html      # Offline / connection-retry fallback page
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🧪 Scripts & Verification

```bash
npm run typecheck    # Run TypeScript compiler checks (tsc --noEmit)
npm run compile      # Compile TypeScript and copy renderer assets to dist/
npm run dev          # Compile and launch Muse Desktop
npm run smoke        # Compile and run headless Electron startup verification
npm run icons        # Regenerate assets/icon.png, tray.png, and icon.ico
```

---

## 🔨 Build & Packaging

Build production desktop installers across operating systems:

```bash
# General production build for current OS
npm run build

# Platform-specific packages
npm run build:win      # Windows (.exe NSIS installer & portable)
npm run build:mac      # macOS (.dmg)
npm run build:linux    # Linux (.AppImage / .deb)
```

Output artifacts are written to `release/`.

---

## 🔒 Security & Privacy

- `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true` enabled across windows.
- IPC communication strictly scoped via `contextBridge` in [src/preload/index.ts](src/preload/index.ts).
- Permission requests (notifications, clipboard, media, fullscreen) restricted to trusted `muse.ai` origins.
- External links automatically sanitized (`http:` / `https:` only) and opened in the default system browser, while Meta/Facebook OAuth popups stay isolated in-app.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
