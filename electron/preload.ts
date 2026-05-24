import { contextBridge, ipcRenderer } from 'electron'
import type { AppConfig, Rule, OrganizeResult, Stats, ActivityEntry } from './types'

const api = {
  // Commands
  organize: (): Promise<OrganizeResult> =>
    ipcRenderer.invoke('organize'),

  getConfig: (): Promise<AppConfig> =>
    ipcRenderer.invoke('get-config'),

  setConfig: (patch: Partial<AppConfig>): Promise<void> =>
    ipcRenderer.invoke('set-config', patch),

  getRules: (): Promise<Rule[]> =>
    ipcRenderer.invoke('get-rules'),

  setRules: (rules: Rule[]): Promise<void> =>
    ipcRenderer.invoke('set-rules', rules),

  getStats: (): Promise<Stats & { activity: ActivityEntry[] }> =>
    ipcRenderer.invoke('get-stats'),

  getLogs: (maxLines?: number): Promise<string[]> =>
    ipcRenderer.invoke('get-logs', maxLines),

  clearLogs: (): Promise<void> =>
    ipcRenderer.invoke('clear-logs'),

  startWatcher: (): Promise<void> =>
    ipcRenderer.invoke('start-watcher'),

  stopWatcher: (): Promise<void> =>
    ipcRenderer.invoke('stop-watcher'),

  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('select-folder'),

  setFolder: (p: string): Promise<void> =>
    ipcRenderer.invoke('set-folder', p),

  checkForUpdates: (): Promise<void> =>
    ipcRenderer.invoke('check-for-updates'),

  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke('open-external', url),

  // Events — return cleanup function
  onLog: (cb: (line: string) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, line: string) => cb(line)
    ipcRenderer.on('log', handler)
    return () => ipcRenderer.removeListener('log', handler)
  },

  onOrganizeComplete: (cb: (result: OrganizeResult) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, result: OrganizeResult) => cb(result)
    ipcRenderer.on('organize-complete', handler)
    return () => ipcRenderer.removeListener('organize-complete', handler)
  },

  onWatcherStatus: (cb: (active: boolean) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, active: boolean) => cb(active)
    ipcRenderer.on('watcher-status', handler)
    return () => ipcRenderer.removeListener('watcher-status', handler)
  },

  onUpdateAvailable: (cb: (version: string) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, version: string) => cb(version)
    ipcRenderer.on('update-available', handler)
    return () => ipcRenderer.removeListener('update-available', handler)
  },

  onUpdateStatus: (cb: (status: UpdateStatus) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, status: UpdateStatus) => cb(status)
    ipcRenderer.on('update-status', handler)
    return () => ipcRenderer.removeListener('update-status', handler)
  },
}

export type UpdateStatus =
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number }
  | { type: 'downloaded' }
  | { type: 'error'; message: string }

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
