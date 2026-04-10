const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  clipboard,
  Tray,
  Menu,
  nativeImage,
  screen,
} = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { exec, execSync } = require("child_process");
const Store = require("electron-store");
const { uIOhook, UiohookKey } = require("uiohook-napi");

const store = new Store({
  name: "json-prompter-data",
  defaults: { history: [], doubleCtrlEnabled: true, templates: [], windowBounds: null },
});

function getSettingDefault(key) {
  const defaults = { theme: "auto", prettyJson: true };
  return key in defaults ? defaults[key] : null;
}

const WIN_W = 520;
const WIN_H = 580;

let mainWindow = null;
let tray = null;
let lastCtrlTime = 0;
const DOUBLE_TAP_THRESHOLD = 350; // ms between two Ctrl presses to count as a double-tap
let savedHwnd = null; // HWND of the window that had focus before we appeared
let savedForegroundRect = null;

// ── Window ──

function createWindow() {
  const logoPath = app.isPackaged
    ? path.join(__dirname, "../shared/resources/logo.png")
    : path.join(__dirname, "../../shared/resources/logo.png");

  mainWindow = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    icon: logoPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.on("blur", () => {
    if (mainWindow?.isVisible()) mainWindow.hide();
  });

  mainWindow.on("moved", () => {
    const [x, y] = mainWindow.getPosition();
    store.set("windowBounds", { x, y });
  });
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    captureForegroundWindow();
    let targetX, targetY;

    if (savedForegroundRect && process.platform === "win32") {
      const { left, top, right } = savedForegroundRect;
      const fgW = right - left;
      targetX = Math.round(left + fgW / 2 - WIN_W / 2);
      targetY = top - WIN_H - 8;

      const display = screen.getDisplayNearestPoint({ x: Math.round(left + fgW / 2), y: top });
      const { x: wa_x, y: wa_y, width: wa_w, height: wa_h } = display.workArea;
      targetX = Math.max(wa_x, Math.min(targetX, wa_x + wa_w - WIN_W));
      targetY = Math.max(wa_y, Math.min(targetY, wa_y + wa_h - WIN_H));
    } else {
      const stored = store.get("windowBounds");
      if (stored) {
        targetX = stored.x;
        targetY = stored.y;
      } else {
        const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
        targetX = Math.round(screenW / 2 - WIN_W / 2);
        targetY = Math.round(screenH / 2 - WIN_H / 2);
      }
    }

    mainWindow.setPosition(targetX, targetY);
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send("window-shown");
  }
}

// ── Focus capture (Windows only) ──
// Saves the HWND of the foreground window so we can paste back into it later

function captureForegroundWindow() {
  if (process.platform !== "win32") return;
  try {
    const script = [
      'Add-Type @"',
      "using System;",
      "using System.Runtime.InteropServices;",
      "public class _WinUtil2 {",
      '    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
      '    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);',
      "    public struct RECT { public int Left, Top, Right, Bottom; }",
      "}",
      '"@',
      "$hwnd = [_WinUtil2]::GetForegroundWindow()",
      "$rect = New-Object _WinUtil2+RECT",
      "[_WinUtil2]::GetWindowRect($hwnd, [ref]$rect) | Out-Null",
      "Write-Output $hwnd",
      "Write-Output $rect.Left",
      "Write-Output $rect.Top",
      "Write-Output $rect.Right",
      "Write-Output $rect.Bottom",
    ].join("\n");
    const tmp = path.join(os.tmpdir(), "jp_get_hwnd.ps1");
    fs.writeFileSync(tmp, script);
    const result = execSync(`powershell -ExecutionPolicy Bypass -File "${tmp}"`, {
      encoding: "utf8",
      timeout: 1000,
    });
    const lines = result.trim().split(/\r?\n/);
    savedHwnd = lines[0]?.trim() || null;
    if (lines.length >= 5) {
      savedForegroundRect = {
        left: parseInt(lines[1], 10),
        top: parseInt(lines[2], 10),
        right: parseInt(lines[3], 10),
        bottom: parseInt(lines[4], 10),
      };
    } else {
      savedForegroundRect = null;
    }
  } catch {
    savedHwnd = null;
    savedForegroundRect = null;
  }
}

// ── Hotkeys ──

function registerHotkeys() {
  // Fallback shortcut (works without elevated permissions)
  globalShortcut.register("CmdOrCtrl+Shift+J", toggleWindow);

  // Double-tap Ctrl detection via global keyboard hook
  uIOhook.on("keydown", (e) => {
    if (!store.get("doubleCtrlEnabled")) return;
    const isCtrl = e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight;
    if (!isCtrl) return;
    const now = Date.now();
    if (now - lastCtrlTime < DOUBLE_TAP_THRESHOLD) {
      lastCtrlTime = 0; // reset so a triple-tap doesn't re-trigger
      toggleWindow();
    } else {
      lastCtrlTime = now;
    }
  });

  uIOhook.start();
}

// ── Tray ──

function createTray() {
  const logoPath = app.isPackaged
    ? path.join(__dirname, "../shared/resources/logo.png")
    : path.join(__dirname, "../../shared/resources/logo.png");
  const icon = nativeImage.createFromPath(logoPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip("JSON Prompter — Ctrl+Shift+J");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show", click: toggleWindow },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ])
  );
  tray.on("click", toggleWindow);
}

// ── IPC Handlers ──

ipcMain.handle("copy-json", (_event, jsonString) => {
  clipboard.writeText(jsonString);
  saveToHistory(jsonString);
  return true;
});

ipcMain.handle("paste-json", (_event, jsonString) => {
  clipboard.writeText(jsonString);
  saveToHistory(jsonString);

  const hwnd = savedHwnd;
  mainWindow.once("hide", () => {
    if (process.platform === "win32" && hwnd) {
      pasteOnWindows(hwnd);
    } else {
      exec(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`);
    }
  });

  mainWindow.hide();
  return true;
});

ipcMain.handle("get-history", () => store.get("history") || []);

ipcMain.handle("clear-history", () => {
  store.set("history", []);
  return true;
});

ipcMain.handle("hide-window", () => {
  mainWindow.hide();
  return true;
});

ipcMain.handle("get-double-ctrl", () => store.get("doubleCtrlEnabled"));

ipcMain.handle("set-double-ctrl", (_event, enabled) => {
  store.set("doubleCtrlEnabled", !!enabled);
  return true;
});

ipcMain.handle("get-setting", (_e, key) => store.get(`setting_${key}`, getSettingDefault(key)));

ipcMain.handle("set-setting", (_e, key, val) => {
  store.set(`setting_${key}`, val);
  return true;
});

ipcMain.handle("get-templates", () => store.get("templates") || []);
ipcMain.handle("set-templates", (_event, templates) => { store.set("templates", templates); return true; });

// ── Helpers ──

function saveToHistory(jsonString) {
  const history = store.get("history") || [];
  history.unshift({ json: jsonString, timestamp: Date.now() });
  store.set("history", history.slice(0, 50)); // keep last 50 entries
}

// Restores focus to the given window handle, then simulates Ctrl+V
function pasteOnWindows(hwnd) {
  const script = [
    'Add-Type @"',
    "using System;",
    "using System.Runtime.InteropServices;",
    "public class _WinPaste {",
    '    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);',
    '    [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);',
    "}",
    '"@',
    `[_WinPaste]::SetForegroundWindow([IntPtr]${hwnd})`,
    "Start-Sleep -Milliseconds 150",
    "[_WinPaste]::keybd_event(0x11, 0, 0, [UIntPtr]::Zero)", // Ctrl down
    "[_WinPaste]::keybd_event(0x56, 0, 0, [UIntPtr]::Zero)", // V down
    "[_WinPaste]::keybd_event(0x56, 0, 2, [UIntPtr]::Zero)", // V up
    "[_WinPaste]::keybd_event(0x11, 0, 2, [UIntPtr]::Zero)", // Ctrl up
  ].join("\n");
  const tmp = path.join(os.tmpdir(), "jp_paste.ps1");
  fs.writeFileSync(tmp, script);
  exec(`powershell -ExecutionPolicy Bypass -File "${tmp}"`);
}

// ── App Lifecycle ──

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerHotkeys();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  uIOhook.stop();
});

// Keep the app running in the tray when all windows are closed
app.on("window-all-closed", (e) => e.preventDefault());
