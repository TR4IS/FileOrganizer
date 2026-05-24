import { app, BrowserWindow, Menu } from 'electron'
import path from 'path'
import { Organizer } from './organizer'
import { DirectoryWatcher } from './watcher'
import { registerIpcHandlers } from './ipc'
import { AppTray } from './tray'
import { setupUpdater, triggerCheckForUpdates } from './updater'
import { getConfig, getRules, checkDailyReset, appendLog } from './config'

let mainWindow: BrowserWindow | null = null
let isQuitting = false  // tracks app.quit() so close handler doesn't hide on real quit

// App-level logger — writes to the log file AND forwards to renderer if window is open
function log(line: string): void {
  console.log(line)
  try { appendLog(line) } catch { /* ignore if userData not ready */ }
  mainWindow?.webContents.send('log', line)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 860,
    minHeight: 580,
    frame: true,
    backgroundColor: '#0f0f0f',
    // app.getAppPath() works in both dev and packaged (asar) builds
    icon: path.join(app.getAppPath(), 'docs', 'FileOrganizer.ico'),
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

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    log(`[!] Renderer failed to load: ${code} ${desc}`)
  })
}

app.whenReady().then(() => {
  log('[*] App starting')
  checkDailyReset()

  const config = getConfig()
  log(`[*] Config loaded — target: "${config.targetPath}"`)
  const rules = getRules()
  log(`[*] Rules loaded — ${rules.length} rules`)

  const organizer = new Organizer(config.targetPath, rules, log)

  // Shared trigger used by both watcher and tray
  const triggerOrganize = () => {
    try {
      const result = organizer.organize()
      mainWindow?.webContents.send('organize-complete', result)
    } catch (err) {
      log(`[!] Organize failed: ${err}`)
    }
  }

  const watcher = new DirectoryWatcher(
    () => {
      log('[*] Watcher triggered organize')
      triggerOrganize()
    },
    config.debounceSeconds * 1000,
  )

  createWindow()

  const tray = new AppTray(
    () => mainWindow,
    triggerOrganize,
    triggerCheckForUpdates,
    log,
  )
  tray.create(config.runInBackground, path.basename(config.targetPath))

  registerIpcHandlers(() => mainWindow, organizer, watcher)
  setupUpdater(() => mainWindow)

  // Defer watcher auto-start until renderer is fully loaded
  if (config.autoStartWatcher || config.runInBackground) {
    mainWindow!.webContents.once('did-finish-load', () => {
      log(`[*] Auto-starting watcher on: ${config.targetPath}`)
      watcher.start(config.targetPath)
    })
  }

  // isQuitting prevents the hide-on-close from blocking a real app.quit()
  app.on('before-quit', () => { isQuitting = true })

  mainWindow!.on('close', (e) => {
    if (isQuitting) {
      tray.destroy()
      return
    }
    const cfg = getConfig()
    if (cfg.runInBackground) {
      e.preventDefault()
      mainWindow!.hide()
      tray.update(watcher.isRunning(), path.basename(cfg.targetPath))
      log('[*] Window hidden to tray')
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
