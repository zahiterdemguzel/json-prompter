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
  defaults: { history: [], favorites: [] },
});

let mainWindow = null;
let tray = null;
let lastCtrlTime = 0;
const DOUBLE_TAP_THRESHOLD = 350; // ms
let savedHwnd = null; // foreground window before we stole focus

function createWindow() {
  const { width: screenW, height: screenH } =
    screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 520,
    height: 580,
    x: Math.round(screenW / 2 - 260),
    y: Math.round(screenH / 2 - 290),
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.on("blur", () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
    }
  });
}

function captureForegroundWindow() {
  if (process.platform !== "win32") return;
  try {
    const script = [
      'Add-Type @"',
      "using System;",
      "using System.Runtime.InteropServices;",
      "public class _WinUtil {",
      '    [DllImport("user32.dll")]',
      "    public static extern IntPtr GetForegroundWindow();",
      "}",
      '"@',
      "[_WinUtil]::GetForegroundWindow()",
    ].join("\n");
    const tmp = path.join(os.tmpdir(), "jp_get_hwnd.ps1");
    fs.writeFileSync(tmp, script);
    const result = execSync(`powershell -ExecutionPolicy Bypass -File "${tmp}"`, {
      encoding: "utf8",
      timeout: 1000,
    });
    savedHwnd = result.trim();
  } catch (e) {
    savedHwnd = null;
  }
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    captureForegroundWindow();
    const { width: screenW, height: screenH } =
      screen.getPrimaryDisplay().workAreaSize;
    mainWindow.setPosition(
      Math.round(screenW / 2 - 260),
      Math.round(screenH / 2 - 290)
    );
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send("window-shown");
  }
}

function registerHotkey() {
  // Fallback shortcut
  globalShortcut.register("CmdOrCtrl+Shift+J", toggleWindow);

  // Double-Ctrl detection via global keyboard hook
  uIOhook.on("keydown", (e) => {
    const isCtrl = e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight;
    if (!isCtrl) return;
    const now = Date.now();
    if (now - lastCtrlTime < DOUBLE_TAP_THRESHOLD) {
      lastCtrlTime = 0; // reset so triple-tap doesn't re-trigger
      toggleWindow();
    } else {
      lastCtrlTime = now;
    }
  });

  uIOhook.start();
}

function createTray() {
  // Create a simple 16x16 tray icon
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAiklEQVQ4T2NkoBAwUqifYdAb8P/fn/9MDIwMjIyMDIwszIxMzEyM//78+f/v7z8GBgYGBkZGJkZGJiYGZmYmRiZmZkYmJiYGRkYGBiYmJkYGRkYGJiYmRkZGBgYmJiZGBgaG/6AMRBYXM5BswGBzARkG4FMzmA0g2wB8BpA7GoZOPCAWAwAqLy0R4g1O2AAAAABJRU5ErkJggg=="
  );
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
  // Save to history
  const history = store.get("history") || [];
  history.unshift({
    json: jsonString,
    timestamp: Date.now(),
  });
  // Keep last 50
  store.set("history", history.slice(0, 50));
  return true;
});

ipcMain.handle("paste-json", (_event, jsonString) => {
  clipboard.writeText(jsonString);
  // Save to history
  const history = store.get("history") || [];
  history.unshift({ json: jsonString, timestamp: Date.now() });
  store.set("history", history.slice(0, 50));

  const hwnd = savedHwnd;
  mainWindow.once("hide", () => {
    if (process.platform === "win32" && hwnd) {
      // Restore focus to the captured window, then send Ctrl+V
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
    } else {
      // macOS fallback
      exec(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`);
    }
  });

  mainWindow.hide();
  return true;
});

ipcMain.handle("get-history", () => {
  return store.get("history") || [];
});

ipcMain.handle("clear-history", () => {
  store.set("history", []);
  return true;
});

ipcMain.handle("hide-window", () => {
  mainWindow.hide();
  return true;
});

// ── App Lifecycle ──

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerHotkey();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  uIOhook.stop();
});

app.on("window-all-closed", (e) => {
  e.preventDefault(); // Keep running in tray
});
