import fs from 'fs'
import path from 'path'
import type { Rule, OrganizeResult } from './types'

const TEMP_EXTENSIONS = new Set([
  '.crdownload', '.part', '.part1', '.part2', '.part3',
  '.tmp', '.temp', '.download',
])

export class Organizer {
  private extensionMap: Map<string, string>
  private retryTracker = new Map<string, number>()
  private readonly retryLimit: number

  constructor(
    private targetPath: string,
    rules: Rule[],
    private logger: (line: string) => void,
    retryLimit = 720,
  ) {
    this.retryLimit = retryLimit
    this.extensionMap = buildExtensionMap(rules)
  }

  updateRules(rules: Rule[]): void {
    this.extensionMap = buildExtensionMap(rules)
  }

  updateTargetPath(p: string): void {
    this.targetPath = p
  }

  organize(): OrganizeResult {
    let createdFolders = 0
    let movedFiles = 0
    let movedDirectories = 0
    let deferredFiles = 0
    let errors = 0

    const folderNames = new Set(this.extensionMap.values())
    folderNames.add('random')

    // Ensure category folders exist
    for (const folder of folderNames) {
      const folderPath = path.join(this.targetPath, folder)
      if (!fs.existsSync(folderPath)) {
        try {
          fs.mkdirSync(folderPath, { recursive: true })
          createdFolders++
          this.logger(`[+] Created folder: ${folderPath}`)
        } catch (err) {
          errors++
          this.logger(`[!] Error creating folder ${folderPath}: ${err}`)
          return { createdFolders, movedFiles, movedDirectories, deferredFiles, errors }
        }
      }
    }

    // List target directory
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(this.targetPath, { withFileTypes: true })
    } catch (err) {
      this.logger(`[!] Error reading directory: ${err}`)
      return { createdFolders, movedFiles, movedDirectories, deferredFiles, errors: errors + 1 }
    }

    for (const entry of entries) {
      // Skip category folders themselves
      if (entry.isDirectory()) {
        if (folderNames.has(entry.name)) continue
        const dest = path.join(this.targetPath, 'random', entry.name)
        if (moveItem(path.join(this.targetPath, entry.name), dest, this.logger)) {
          movedDirectories++
          this.logger(`[->] Moved folder: ${entry.name} -> random/`)
        } else {
          errors++
        }
        continue
      }

      const ext = path.extname(entry.name).toLowerCase()
      if (TEMP_EXTENSIONS.has(ext)) continue

      const filePath = path.join(this.targetPath, entry.name)
      if (!isFileReady(filePath)) {
        const retries = (this.retryTracker.get(entry.name) ?? 0) + 1
        this.retryTracker.set(entry.name, retries)
        if (retries < this.retryLimit) deferredFiles++
        continue
      }

      this.retryTracker.delete(entry.name)
      const folder = this.extensionMap.get(ext) ?? 'random'
      const dest = path.join(this.targetPath, folder, entry.name)

      if (moveItem(filePath, dest, this.logger)) {
        movedFiles++
        this.logger(`[->] ${entry.name} -> ${folder}/`)
      } else {
        errors++
      }
    }

    if (deferredFiles === 0) {
      this.logger(`Done organizing ${this.targetPath}!`)
    }

    return { createdFolders, movedFiles, movedDirectories, deferredFiles, errors }
  }
}

function buildExtensionMap(rules: Rule[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const rule of rules) {
    const ext = rule.extension.toLowerCase()
    if (!map.has(ext)) map.set(ext, rule.folder)
  }
  return map
}

function isFileReady(filePath: string): boolean {
  try {
    // Use 'r+' — open for read+write, never creates, fails if locked
    const fd = fs.openSync(filePath, 'r+')
    fs.closeSync(fd)
    return true
  } catch {
    return false
  }
}

function moveItem(src: string, dest: string, logger: (l: string) => void): boolean {
  try {
    fs.renameSync(src, dest)
    return true
  } catch (err: unknown) {
    // EXDEV = cross-device move; fall back to copy+delete
    if (isExdevError(err)) {
      try {
        fs.copyFileSync(src, dest)
        fs.unlinkSync(src)
        return true
      } catch (copyErr) {
        logger(`[!] Failed to copy ${path.basename(src)}: ${copyErr}`)
        return false
      }
    }
    logger(`[!] Failed to move ${path.basename(src)}: ${err}`)
    return false
  }
}

function isExdevError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as NodeJS.ErrnoException).code === 'EXDEV'
}
