// keyboard-helper.js
// Uses Electron's built-in approach to simulate paste
const { exec } = require("child_process");

const isMac = process.platform === "darwin";

const keyboard = {
  paste() {
    if (isMac) {
      // Use AppleScript to simulate Cmd+V
      exec(
        `osascript -e 'tell application "System Events" to keystroke "v" using command down'`
      );
    } else {
      // Use PowerShell to simulate Ctrl+V on Windows
      exec(
        `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"`
      );
    }
  },
};

module.exports = { keyboard };
