import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'

export function setupUpdater(getWindow: () => BrowserWindow | null): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    getWindow()?.webContents.send('update-available', info.version)
  })

  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  autoUpdater.on('error', (err) => {
    console.error('Update error:', err)
  })

  ipcMain.handle('check-for-updates', async () => {
    try {
      await autoUpdater.checkForUpdates()
    } catch {
      // ignore network errors during manual check
    }
  })

  // Silent check on startup after 3s delay
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => { /* ignore in dev */ })
  }, 3000)
}
