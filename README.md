# JSON Prompter

Build JSON visually and paste it instantly into any text field — available as a **desktop app** (Windows/macOS) and a **Chrome extension**.

---

## What it does

- Build JSON by filling in key-value pairs — no typing curly braces
- Set the type of each value (`string`, `number`, `boolean`, `null`) with one click
- See a live preview of your JSON as you type
- Paste directly into any focused text field, or copy to clipboard
- Automatically saves your last 50 JSON objects so you can reuse them

---

## How to open it

**Desktop app:**
- Press `Ctrl+Shift+J` from anywhere on your computer
- Double-tap `Ctrl`
- Click the system tray icon

**Chrome extension:**
- Press `Ctrl+Shift+J` (or `Cmd+Shift+J` on Mac)
- Double-tap `Ctrl` on any page
- Click the floating button that appears near text fields on AI sites (ChatGPT, Claude.ai, Gemini, etc.)

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Tab` (in last field) | Add a new row |
| `↑` / `↓` | Move between rows |
| `Backspace` (empty row) | Delete that row |
| `Ctrl/Cmd+Enter` | Paste JSON & close |
| `Escape` | Close without pasting |
| `Ctrl+Shift+J` | Open JSON Prompter |
| Double-tap `Ctrl` | Open JSON Prompter (alternate) |

---

## Getting Started

**Requirements:** Node.js 18+ and npm 9+

```bash
# Install dependencies
npm install

# Run the desktop app
npm run start:electron

# Build the Chrome extension, then load it in your browser
npm run build:extension
```

To load the extension: open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select the `packages/chrome-extension` folder.

---

## Build for distribution

```bash
npm run build:electron:mac    # macOS installer (.dmg)
npm run build:electron:win    # Windows installer (.exe)
npm run build:extension       # Prepare Chrome extension for loading
```

---

## Privacy

JSON Prompter does not collect or share any data. All history is stored locally on your device and never leaves it. There are no analytics, telemetry, or network requests.

---

## License

MIT
