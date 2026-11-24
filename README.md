# Muse Desktop (Electron)

A cross-platform Electron desktop client for **Muse** — the personal AI assistant by Meta (Facebook).

---

## 📌 Overview

**Muse** is an intelligent personal AI assistant built to streamline daily workflows, summarize content, automate tasks, and assist across productivity and communication channels. 

This project packages Muse into a native desktop experience using [Electron](https://www.electronjs.org/), bringing quick hotkey access, system tray integration, native OS notifications, and desktop multitasking to your AI assistant workflow.

---

## 💡 Why Build This?

> *"Because Chrome already has way too much going on."*

Modern web browsers like Google Chrome have become overcrowded with dozens (or hundreds) of open tabs, heavy extensions, background tasks, and endless clutter. Using your primary AI assistant inside an already overloaded browser comes with real friction:

- **Lost in Tab Hell**: Your assistant gets buried under countless tabs, docs, and search results.
- **Resource Competition**: Chrome is already notorious for heavy RAM and CPU consumption; running persistent AI tools inside it only adds to memory bloat.
- **Context Switching**: Having to hunt down the right browser window or tab breaks your flow while coding, writing, or working in other desktop applications.
- **A Dedicated Workspace**: A standalone Electron app provides a lightweight, focused, single-purpose home for Muse—accessible via a single global hotkey, docked to the side, or tucked neatly into the system tray without competing with browser sessions.

---

## ✨ Features

- **Global Quick Access (Spotlight / Raycast style)**: Summon Muse instantly anywhere on your system via a customizable global hotkey (e.g., `Alt + Space` / `Cmd + Space`).
- **Always-on-Top & Overlay Modes**: Keep your assistant docked or floating beside your active workspace for real-time reference and note-taking.
- **System Tray Integration**: Runs quietly in the background without cluttering the taskbar; quickly open chat sessions or quick prompts from the tray.
- **Native Notifications**: Stay informed with OS-native alerts for task completions, reminders, and background processing.
- **Context-Aware Assistance**: Clipboard integration, drag-and-drop file/document analysis, and screenshot inputs.
- **Secure Credential Management**: Safe local storage of session tokens and account credentials leveraging the OS keychain / DPAPI.

---

## 🛠️ Tech Stack (Recommended)

- **Framework**: Electron
- **Language**: TypeScript / JavaScript
- **Bundler & Tooling**: Vite + Electron Forge / Electron Builder
- **Renderer UI**: React / Vue / Tailwind CSS (or your choice of frontend framework)
- **State & Storage**: Secure local storage / electron-store

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.x or v20+ recommended)
- [npm](https://www.npmjs.com/), [pnpm](https://pnpm.io/), or [yarn](https://yarnpkg.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Vector-Networks/Muse-Electron.git
   cd Muse-Electron
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure Environment (Optional):**
   Create a `.env` file in the root directory:
   ```env
   MUSE_APP_URL=https://muse.ai
   # Add any custom client or authentication config here
   ```

4. **Launch in Development:**
   ```bash
   npm run dev
   # or
   npm start
   ```

---

## 📦 Project Structure

```text
Muse-Electron/
├── src/
│   ├── main/                 # Electron main process (lifecycle, tray, hotkeys, windows)
│   │   ├── index.ts
│   │   ├── shortcuts.ts
│   │   ├── tray.ts
│   │   └── window.ts
│   ├── preload/              # Preload scripts (secure contextBridge & IPC APIs)
│   │   └── index.ts
│   └── renderer/             # Frontend interface / client UI
│       ├── src/
│       └── index.html
├── assets/                   # Icons, tray graphics, and static media
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔨 Build & Packaging

Build production desktop executables across operating systems:

```bash
# General production build
npm run build

# Platform-specific packages
npm run build:win      # Windows (.exe / installer)
npm run build:mac      # macOS (.dmg)
npm run build:linux    # Linux (.AppImage / .deb)
```

---

## 🔒 Security & Privacy

- Full `contextIsolation` enabled across all BrowserWindow instances.
- `nodeIntegration` disabled in renderers.
- IPC communication strictly validated and exposed via `contextBridge`.
- Sanitized external links opening in the default system browser rather than the app window.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
