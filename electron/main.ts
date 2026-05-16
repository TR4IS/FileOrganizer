import { app, BrowserWindow, ipcMain } from 'electron'
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
    width: 900,
    height: 620,
    minWidth: 700,
    minHeight: 500,
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

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  const config = getConfig()
  const rules = getRules()

  const organizer = new Organizer(config.targetPath, rules, () => {})
  const watcher = new DirectoryWatcher(
    () => organizer.organize(),
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

  if (config.autoStartWatcher && config.runInBackground) {
    watcher.start(config.targetPath)
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
