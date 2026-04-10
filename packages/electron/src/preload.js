const { contextBridge, ipcRenderer } = require("electron");

// Exposes a safe, narrow API to the renderer process via the context bridge.
// The renderer (and shared UI modules) call window.api.* — never directly touching Node or IPC.
contextBridge.exposeInMainWorld("api", {
  copyJson:        (json) => ipcRenderer.invoke("copy-json", json),
  pasteJson:       (json) => ipcRenderer.invoke("paste-json", json),
  getHistory:      ()     => ipcRenderer.invoke("get-history"),
  clearHistory:    ()     => ipcRenderer.invoke("clear-history"),
  hideWindow:      ()     => ipcRenderer.invoke("hide-window"),
  onWindowShown:   (cb)   => ipcRenderer.on("window-shown", cb),
  getDoubleCtrl:   ()     => ipcRenderer.invoke("get-double-ctrl"),
  setDoubleCtrl:   (v)    => ipcRenderer.invoke("set-double-ctrl", v),
  isExtension: false,
});
