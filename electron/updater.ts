import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'

export function setupUpdater(getWindow: () => BrowserWindow | null): void {
  autoUpdater.autoDownload = true          // download as soon as update is found
  autoUpdater.autoInstallOnAppQuit = true

  const emit = (channel: string, ...args: unknown[]) =>
    getWindow()?.webContents.send(channel, ...args)

  autoUpdater.on('update-available', (info) => {
    emit('update-status', { type: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    emit('update-status', { type: 'not-available' })
  })

  autoUpdater.on('download-progress', (progress) => {
    emit('update-status', { type: 'downloading', percent: Math.round(progress.percent) })
  })

  autoUpdater.on('update-downloaded', () => {
    emit('update-status', { type: 'downloaded' })
    // Install immediately on next quit
    autoUpdater.quitAndInstall(false, true)
  })

  autoUpdater.on('error', (err) => {
    console.error('Update error:', err)
    emit('update-status', { type: 'error', message: err.message })
  })

  ipcMain.handle('check-for-updates', async () => {
    try {
      await autoUpdater.checkForUpdates()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      emit('update-status', { type: 'error', message })
    }
  })

  // Silent background check on startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => { /* not packaged / offline */ })
  }, 3000)
}
