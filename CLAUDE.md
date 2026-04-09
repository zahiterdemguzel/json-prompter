# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Structure

Monorepo with two packages and a shared UI library.

```
packages/
  shared/          # Shared CSS and JS modules (no framework, no build step)
    styles/theme.css
    js/state.js        # Row state, TYPES constant
    js/utils.js        # escHtml, timeAgo, showToast
    js/json-builder.js # buildJson, updatePreview
    js/renderer.js     # render, addRow, handleKeyNav
    js/history.js      # loadHistory, loadFromHistory, clearHistory
    js/app.js          # Entry point — wires up tabs, buttons, keyboard shortcuts

  electron/        # Desktop app (Electron)
    src/main.js    # Window, tray, hotkeys, IPC handlers, electron-store
    src/preload.js # Context bridge: exposes window.api to renderer via IPC
    src/index.html # Shell: imports shared CSS/JS, adds Electron-specific styles

  chrome-extension/  # Browser extension (MV3)
    manifest.json
    popup.html         # Shell: imports shared CSS/JS (from ./shared/ copy)
    api.js             # Implements window.api using chrome.storage + clipboard
    build.js           # Copies packages/shared/ into ./shared/ (run before loading extension)
    generate-icons.js  # Generates PNG icons (run once)
```

## Commands

```bash
# Run Electron app
npm run start:electron

# Build Electron installers
npm run build:electron:mac
npm run build:electron:win

# Prepare Chrome extension (must run before loading in browser)
npm run build:extension

# Regenerate extension icons (only needed once)
npm run icons:extension
```

## Architecture

Both apps share UI code via `packages/shared/`. The only platform-specific layer is `window.api`:
- **Electron**: `preload.js` sets `window.api` via `contextBridge` (IPC calls to `main.js`)
- **Chrome**: `api.js` sets `window.api` using `chrome.storage.local` + `navigator.clipboard`

The `window.api` contract: `copyJson`, `pasteJson`, `getHistory`, `clearHistory`, `hideWindow`, `onWindowShown`, `isExtension`.

## Key Design Details

- No bundler — both Electron and MV3 Chrome support ES modules natively (`<script type="module">`)
- Chrome extension can't paste into other windows — `pasteJson` copies to clipboard and closes popup
- Electron captures the foreground window HWND before showing, then uses PowerShell + user32.dll to paste back
- History: Electron uses `electron-store` (filesystem), Chrome uses `chrome.storage.local`, both cap at 50 entries
- `packages/chrome-extension/shared/` is gitignored — regenerate with `npm run build:extension`
