# JSON Prompter ⚡

A lightning-fast JSON generator that lives in your system tray. Summon it instantly, build JSON without typing `{`, `"`, or `:`, and paste it directly into any text field.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run in dev mode
npm start
```

## Build Installers

```bash
# macOS (.dmg)
npm run build:mac

# Windows (.exe installer)
npm run build:win

# Both
npm run build
```

---

## How to Use

### Summon the Window
| Shortcut | Action |
|---|---|
| **Ctrl+Shift+J** (Win) / **Cmd+Shift+J** (Mac) | Toggle the window |
| **Ctrl+`** (backtick) | Alternative toggle |
| **Tray icon click** | Toggle the window |

### Build JSON
- Type a **key** on the left, a **value** on the right
- Click the **type badge** (STR / NUM / BOOL / NULL) to cycle value types
- Press **Tab** on the last value field to add a new row
- Press **Backspace** on an empty row to delete it
- Use **Arrow Up/Down** to navigate between rows

### Output
| Button | Action |
|---|---|
| **Copy** | Copies JSON to clipboard |
| **Paste & Close** | Copies JSON, hides the window, and simulates Ctrl+V / Cmd+V into the previously focused text field |
| **Ctrl+Enter** / **Cmd+Enter** | Same as Paste & Close |

### History
- Switch to the **History** tab to see your last 50 generated JSON snippets
- Click any entry to reload it into the builder
- All history persists across app restarts

---

## Architecture

```
json-prompter/
├── package.json          # Electron + builder config
├── src/
│   ├── main.js           # Main process: window, tray, hotkeys, IPC
│   ├── preload.js        # Secure bridge between main & renderer
│   ├── keyboard-helper.js # OS-native paste simulation
│   └── index.html        # UI (single-file, no framework)
└── assets/               # Icons (add your .icns / .ico here)
```

### Key Design Decisions

- **Frameless + transparent window** — feels like a native popup, not a full app
- **Always on top** — stays visible while you type in another app
- **Hide on blur** — disappears when you click away, just like Spotlight
- **electron-store** — simple persistent storage for history
- **No framework** — vanilla JS keeps the bundle tiny and startup instant

---

## Tips

- The app sits in your **system tray** (menu bar on Mac, taskbar on Windows)
- It starts hidden — use the shortcut or tray icon to open it
- **Esc** closes the window at any time
- History is stored in `~/.config/json-prompter-data/` (Mac/Linux) or `%APPDATA%/json-prompter-data/` (Windows)
