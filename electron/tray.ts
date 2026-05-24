import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import path from 'path'

export class AppTray {
  private tray: Tray | null = null

  constructor(
    private getWindow: () => BrowserWindow | null,
    private onOrganize: () => void,
    private onCheckUpdates: () => void,
    private log: (line: string) => void = console.error,
  ) {}

  create(watching: boolean, folderName: string): void {
    if (this.tray) {
      this.update(watching, folderName)
      return
    }

    // app.getAppPath() resolves correctly in both dev and packaged (asar) builds
    const iconPath = path.join(app.getAppPath(), 'docs', 'FileOrganizer.ico')
    this.log(`[*] Loading tray icon from: ${iconPath}`)

    let icon: Electron.NativeImage
    try {
      const raw = nativeImage.createFromPath(iconPath)
      if (raw.isEmpty()) {
        this.log('[!] Tray icon loaded but is empty — file may be missing or corrupt')
        icon = nativeImage.createEmpty()
      } else {
        icon = raw.resize({ width: 16, height: 16 })
        this.log('[*] Tray icon loaded OK')
      }
    } catch (err) {
      this.log(`[!] Failed to load tray icon: ${err}`)
      icon = nativeImage.createEmpty()
    }

    try {
      this.tray = new Tray(icon)
      this.tray.setToolTip(
        watching
          ? `FileOrganizer — Watching: ${folderName}`
          : 'FileOrganizer — Idle',
      )
      this.updateMenu()
      this.tray.on('double-click', () => this.showWindow())
      this.log('[*] Tray created successfully')
    } catch (err) {
      this.log(`[!] Failed to create tray: ${err}`)
    }
  }

  update(watching: boolean, folderName: string): void {
    if (!this.tray) return
    this.tray.setToolTip(
      watching
        ? `FileOrganizer — Watching: ${folderName}`
        : 'FileOrganizer — Idle',
    )
    this.updateMenu()
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }

  private showWindow(): void {
    const win = this.getWindow()
    if (!win) return
    win.show()
    win.focus()
  }

  private updateMenu(): void {
    const menu = Menu.buildFromTemplate([
      { label: 'Show FileOrganizer', click: () => this.showWindow() },
      { type: 'separator' },
      { label: 'Organize Now', click: () => this.onOrganize() },
      { label: 'Check for Updates', click: () => this.onCheckUpdates() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ])
    this.tray?.setContextMenu(menu)
  }
}
