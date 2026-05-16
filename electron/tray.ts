import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import path from 'path'

export class AppTray {
  private tray: Tray | null = null

  constructor(
    private getWindow: () => BrowserWindow | null,
    private onOrganize: () => void,
    private onCheckUpdates: () => void,
  ) {}

  create(watching: boolean, folderName: string): void {
    if (this.tray) return

    const iconPath = path.join(
      app.isPackaged ? process.resourcesPath : 'docs',
      'FileOrganizer.ico',
    )
    const icon = nativeImage.createFromPath(iconPath)
    this.tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
    this.tray.setToolTip(
      watching
        ? `FileOrganizer — Watching: ${folderName}`
        : 'FileOrganizer — Idle',
    )
    this.updateMenu()
    this.tray.on('double-click', () => this.showWindow())
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
