const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  copyJson: (json) => ipcRenderer.invoke("copy-json", json),
  pasteJson: (json) => ipcRenderer.invoke("paste-json", json),
  getHistory: () => ipcRenderer.invoke("get-history"),
  clearHistory: () => ipcRenderer.invoke("clear-history"),
  hideWindow: () => ipcRenderer.invoke("hide-window"),
  onWindowShown: (cb) => ipcRenderer.on("window-shown", cb),
});
