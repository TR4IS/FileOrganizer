"use strict";
const electron = require("electron");
const api = {
  // Commands
  organize: () => electron.ipcRenderer.invoke("organize"),
  getConfig: () => electron.ipcRenderer.invoke("get-config"),
  setConfig: (patch) => electron.ipcRenderer.invoke("set-config", patch),
  getRules: () => electron.ipcRenderer.invoke("get-rules"),
  setRules: (rules) => electron.ipcRenderer.invoke("set-rules", rules),
  getStats: () => electron.ipcRenderer.invoke("get-stats"),
  getLogs: (maxLines) => electron.ipcRenderer.invoke("get-logs", maxLines),
  clearLogs: () => electron.ipcRenderer.invoke("clear-logs"),
  startWatcher: () => electron.ipcRenderer.invoke("start-watcher"),
  stopWatcher: () => electron.ipcRenderer.invoke("stop-watcher"),
  selectFolder: () => electron.ipcRenderer.invoke("select-folder"),
  setFolder: (p) => electron.ipcRenderer.invoke("set-folder", p),
  checkForUpdates: () => electron.ipcRenderer.invoke("check-for-updates"),
  openExternal: (url) => electron.ipcRenderer.invoke("open-external", url),
  // Events — return cleanup function
  onLog: (cb) => {
    const handler = (_, line) => cb(line);
    electron.ipcRenderer.on("log", handler);
    return () => electron.ipcRenderer.removeListener("log", handler);
  },
  onOrganizeComplete: (cb) => {
    const handler = (_, result) => cb(result);
    electron.ipcRenderer.on("organize-complete", handler);
    return () => electron.ipcRenderer.removeListener("organize-complete", handler);
  },
  onWatcherStatus: (cb) => {
    const handler = (_, active) => cb(active);
    electron.ipcRenderer.on("watcher-status", handler);
    return () => electron.ipcRenderer.removeListener("watcher-status", handler);
  },
  onUpdateAvailable: (cb) => {
    const handler = (_, version) => cb(version);
    electron.ipcRenderer.on("update-available", handler);
    return () => electron.ipcRenderer.removeListener("update-available", handler);
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
//# sourceMappingURL=preload.js.map
