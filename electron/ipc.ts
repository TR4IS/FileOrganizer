import { ipcMain, dialog, BrowserWindow, app, shell } from 'electron'
import { Organizer } from './organizer'
import { DirectoryWatcher } from './watcher'
import {
  getConfig, setConfig, getRules, setRules,
  getStats, getLogs, clearLogs,
  appendLog, getActivity, incrementStats, recordActivity,
} from './config'
import type { AppConfig, RuleSet } from './types'

export function registerIpcHandlers(
  getWindow: () => BrowserWindow | null,
  organizer: Organizer,
  watcher: DirectoryWatcher,
): void {
  const emit = (channel: string, ...args: unknown[]) => {
    getWindow()?.webContents.send(channel, ...args)
  }

  function log(line: string): void {
    appendLog(line)
    emit('log', line)
    const match = line.match(/^\[->] (.+) -> (.+)\/$/)
    if (match) {
      incrementStats(match[2])
      recordActivity({ filename: match[1], folder: match[2], timestamp: Date.now() })
    }
  }

  ;(organizer as unknown as { logger: (line: string) => void }).logger = log

  ipcMain.handle('organize', async () => {
    const result = organizer.organize()
    emit('organize-complete', result)
    return result
  })

  ipcMain.handle('get-config', () => getConfig())

  ipcMain.handle('set-config', (_e, patch: Partial<AppConfig>) => {
    setConfig(patch)
    if ('debounceSeconds' in patch && patch.debounceSeconds !== undefined) {
      watcher.setDebounce(patch.debounceSeconds * 1000)
    }
    if ('launchAtStartup' in patch) {
      app.setLoginItemSettings({ openAtLogin: patch.launchAtStartup ?? false })
    }
    if ('moveUnmatchedFolders' in patch || 'unmatchedFolderDest' in patch) {
      const cfg = getConfig()
      organizer.updateUnmatchedConfig(cfg.moveUnmatchedFolders, cfg.unmatchedFolderDest)
    }
  })

  ipcMain.handle('get-rules', () => getRules())

  ipcMain.handle('set-rules', (_e, ruleSet: RuleSet) => {
    setRules(ruleSet)
    organizer.updateRules(ruleSet)
  })

  ipcMain.handle('get-stats', () => ({
    ...getStats(),
    activity: getActivity(10),
  }))

  ipcMain.handle('get-logs', (_e, maxLines?: number) => getLogs(maxLines))

  ipcMain.handle('clear-logs', () => clearLogs())

  ipcMain.handle('start-watcher', () => {
    const config = getConfig()
    watcher.start(config.targetPath)
    setConfig({ runInBackground: true })
    log('[*] Background tracking started.')
    emit('watcher-status', true)
  })

  ipcMain.handle('stop-watcher', () => {
    watcher.stop()
    setConfig({ runInBackground: false })
    log('[*] Background tracking stopped.')
    emit('watcher-status', false)
  })

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Folder to Organize',
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const newPath = result.filePaths[0]
    setConfig({ targetPath: newPath })
    organizer.updateTargetPath(newPath)
    if (watcher.isRunning()) {
      watcher.restart(newPath)
      log(`[*] Background tracking moved to ${newPath}`)
    }
    return newPath
  })

  ipcMain.handle('set-folder', (_e, folderPath: string) => {
    setConfig({ targetPath: folderPath })
    organizer.updateTargetPath(folderPath)
    if (watcher.isRunning()) {
      watcher.restart(folderPath)
    }
  })

  ipcMain.handle('open-external', (_e, url: string) => {
    return shell.openExternal(url)
  })
}
