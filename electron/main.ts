import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import path from 'path'
import { Organizer } from './organizer'
import { DirectoryWatcher } from './watcher'
import { registerIpcHandlers } from './ipc'
import { AppTray } from './tray'
import { setupUpdater } from './updater'
import { getConfig, getRules } from './config'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 860,
    minHeight: 580,
    frame: true,
    backgroundColor: '#0f0f0f',
    icon: path.join(
      app.isPackaged ? process.resourcesPath : 'docs',
      'FileOrganizer.ico',
    ),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  Menu.setApplicationMenu(null)

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  const config = getConfig()
  const rules = getRules()

  const organizer = new Organizer(config.targetPath, rules, () => {})
  const watcher = new DirectoryWatcher(
    () => {
      const result = organizer.organize()
      mainWindow?.webContents.send('organize-complete', result)
    },
    config.debounceSeconds * 1000,
  )

  createWindow()

  const tray = new AppTray(
    () => mainWindow,
    () => organizer.organize(),
    () => ipcMain.emit('check-for-updates'),
  )
  tray.create(config.runInBackground, path.basename(config.targetPath))

  registerIpcHandlers(() => mainWindow, organizer, watcher)
  setupUpdater(() => mainWindow)

  // Defer watcher auto-start until the renderer is fully loaded so IPC
  // events aren't dropped on a page that hasn't mounted its listeners yet.
  if (config.autoStartWatcher || config.runInBackground) {
    mainWindow!.webContents.once('did-finish-load', () => {
      watcher.start(config.targetPath)
    })
  }

  mainWindow!.on('close', (e) => {
    const cfg = getConfig()
    if (cfg.runInBackground) {
      e.preventDefault()
      mainWindow!.hide()
      tray.create(true, path.basename(cfg.targetPath))
    } else {
      tray.destroy()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
