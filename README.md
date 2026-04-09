# JSON Prompter

A dual-platform productivity tool for visually building JSON and instantly pasting it into any text field — available as an **Electron desktop app** and a **Chrome extension**.

Built for prompt engineers, developers, and anyone who frequently needs to inject structured JSON into AI chat interfaces, API playgrounds, or web forms.

---

## Features

- **Visual JSON builder** — add typed key-value pairs with a clean, keyboard-driven interface
- **Type system** — cycle through `str`, `num`, `bool`, and `null` per field; values are coerced correctly on output
- **Live preview** — see your JSON update in real time as you type
- **Copy or Paste & Close** — copy to clipboard or instantly inject into your focused text field
- **History** — last 50 JSON objects saved automatically; click any entry to restore it
- **Keyboard-first** — Tab to add rows, arrow keys to navigate, Ctrl/Cmd+Enter to paste, Escape to close

---

## Packages

### Electron (Desktop)

A lightweight always-on-top popup accessible from anywhere on your desktop.

**Activation:**
- `Ctrl+Shift+J` — global shortcut, works in any app
- Double-tap `Ctrl` — rapid-press hotkey via global keyboard hook
- System tray icon

**Paste behavior:** captures the foreground window handle before showing the popup, then restores focus to that window and simulates `Ctrl+V` (Windows via PowerShell/user32.dll; macOS via osascript). Works with any application.

---

### Chrome Extension (Browser)

A popup that integrates directly into your browser workflow.

**Activation:**
- `Ctrl+Shift+J` (or `Cmd+Shift+J` on Mac)
- Double-tap `Ctrl` on any page (via content script)
- Floating button — appears automatically near focused textareas on AI sites (ChatGPT, Claude.ai, Gemini, Perplexity, and others)

**Paste behavior:** finds the last focused input or contentEditable element on the active tab and inserts JSON at the cursor position. Falls back to clipboard copy if the target tab is inaccessible (e.g., `chrome://` pages).

---

## Architecture

Both packages share 100% of their UI code via `packages/shared/`. The only platform-specific layer is a `window.api` object each package provides:

```
packages/
  shared/              # Shared UI — no framework, no build step
    js/
      app.js           # Entry point — tabs, buttons, keyboard shortcuts
      state.js         # Mutable rows array and TYPES constant
      json-builder.js  # buildJson, updatePreview
      renderer.js      # render, addRow, handleKeyNav
      history.js       # loadHistory, loadFromHistory, clearHistory
      utils.js         # escHtml, timeAgo, showToast
    styles/
      theme.css        # Dark theme with CSS variables

  electron/
    src/
      main.js          # Window, tray, global hotkeys, IPC, electron-store
      preload.js       # contextBridge — exposes window.api to renderer
      index.html       # Shell: imports shared CSS/JS

  chrome-extension/
    manifest.json      # MV3 manifest
    api.js             # window.api via chrome.storage + clipboard
    background.js      # Service worker — opens popup, stores tab context
    content.js         # Floating button, double-Ctrl hook, paste handler
    popup.html         # Shell: imports shared CSS/JS
    build.js           # Copies shared/ into extension dir (run before loading)
```

### `window.api` contract

```js
window.api = {
  isExtension: boolean,
  copyJson(json: string): Promise<boolean>,
  pasteJson(json: string): Promise<boolean>,
  getHistory(): Promise<Array<{ json: string, timestamp: number }>>,
  clearHistory(): Promise<boolean>,
  hideWindow(): Promise<void>,
  onWindowShown(callback: () => void): void,
}
```

Both platforms implement this interface identically, keeping all shared UI code platform-agnostic.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install dependencies

```bash
npm install
```

### Run the Electron app

```bash
npm run start:electron
```

### Load the Chrome extension

```bash
npm run build:extension
```

Then open `chrome://extensions`, enable **Developer mode**, and click **Load unpacked** — select `packages/chrome-extension`.

---

## Build

```bash
# Desktop installers
npm run build:electron:mac    # macOS .dmg
npm run build:electron:win    # Windows .exe (NSIS)

# Extension build
npm run build:extension       # Copies shared/ into extension package

# Icon generation (one-time setup)
npm run icons:extension
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Tab` (in last value field) | Add a new row |
| `Ctrl/Cmd+Enter` | Paste & Close |
| `↑` / `↓` | Navigate between rows |
| `Backspace` (empty row) | Delete row |
| `Escape` | Close window / popup |
| `Ctrl+Shift+J` | Open JSON Prompter (global) |
| Double-tap `Ctrl` | Open JSON Prompter (alternate) |

---

## Tech Stack

- **Electron** — desktop shell (v28)
- **Chrome Extension MV3** — browser integration
- **Vanilla JS (ES Modules)** — no framework, no bundler
- **electron-store** — persistent history on desktop
- **chrome.storage.local** — persistent history in browser
- **uiohook-napi** — global keyboard hook for double-tap Ctrl (Electron)
- **JetBrains Mono** + **DM Sans** — UI typography

---

## Privacy Policy

JSON Prompter does not collect, transmit, or share any personal data.

- All JSON history is stored locally on your device (`chrome.storage.local` in the extension, `electron-store` on desktop).
- No analytics, telemetry, or tracking of any kind.
- No network requests are made by this extension.
- Your data never leaves your device.

---

## License

MIT
