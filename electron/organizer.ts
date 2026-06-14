import fs from 'fs'
import path from 'path'
import type { RuleSet, OrganizeResult } from './types'

const TEMP_EXTENSIONS = new Set([
  '.crdownload', '.part', '.part1', '.part2', '.part3',
  '.tmp', '.temp', '.download',
])

export class Organizer {
  private extensionMap: Map<string, string>
  private prefixRules: Array<{ prefix: string; folder: string }>
  private folderNameMap: Map<string, string>
  private moveUnmatchedFolders: boolean
  private unmatchedFolderDest: string
  private retryTracker = new Map<string, number>()
  private readonly retryLimit: number

  constructor(
    private targetPath: string,
    ruleSet: RuleSet,
    private logger: (line: string) => void,
    retryLimit = 720,
    moveUnmatchedFolders = false,
    unmatchedFolderDest = 'random',
  ) {
    this.retryLimit = retryLimit
    this.moveUnmatchedFolders = moveUnmatchedFolders
    this.unmatchedFolderDest = unmatchedFolderDest
    this.extensionMap = buildExtensionMap(ruleSet.fileRules)
    this.prefixRules  = [...ruleSet.prefixRules]
    this.folderNameMap = buildFolderNameMap(ruleSet.folderRules)
  }

  updateRules(ruleSet: RuleSet): void {
    this.extensionMap  = buildExtensionMap(ruleSet.fileRules)
    this.prefixRules   = [...ruleSet.prefixRules]
    this.folderNameMap = buildFolderNameMap(ruleSet.folderRules)
  }

  updateTargetPath(p: string): void {
    this.targetPath = p
  }

  updateUnmatchedConfig(moveUnmatchedFolders: boolean, unmatchedFolderDest: string): void {
    this.moveUnmatchedFolders = moveUnmatchedFolders
    this.unmatchedFolderDest  = unmatchedFolderDest
  }

  organize(): OrganizeResult {
    let createdFolders    = 0
    let movedFiles        = 0
    let movedDirectories  = 0
    let deferredFiles     = 0
    let errors            = 0

    // All destination folder names (used to create dirs upfront and as protected set)
    const allDestinations = new Set<string>([
      ...this.extensionMap.values(),
      ...this.prefixRules.map(r => r.folder),
      ...this.folderNameMap.values(),
      'random',
    ])
    if (this.moveUnmatchedFolders) allDestinations.add(this.unmatchedFolderDest)

    // Ensure all destination folders exist
    for (const folder of allDestinations) {
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

    // Read target directory
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(this.targetPath, { withFileTypes: true })
    } catch (err) {
      this.logger(`[!] Error reading directory: ${err}`)
      return { createdFolders, movedFiles, movedDirectories, deferredFiles, errors: errors + 1 }
    }

    // Pass 1 + 2: files (extension match, then prefix match)
    for (const entry of entries) {
      if (entry.isDirectory()) continue

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

      // Extension match first, then prefix, then random
      const extFolder    = this.extensionMap.get(ext)
      const prefixFolder = extFolder == null
        ? this.prefixRules.find(r => entry.name.startsWith(r.prefix))?.folder
        : undefined
      const destFolder = extFolder ?? prefixFolder ?? 'random'

      const dest = path.join(this.targetPath, destFolder, entry.name)
      if (moveFile(filePath, dest, this.logger)) {
        movedFiles++
        this.logger(`[->] ${entry.name} -> ${destFolder}/`)
      } else {
        errors++
      }
    }

    // Pass 3: directories
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (allDestinations.has(entry.name)) continue  // skip protected (output) folders

      const matchedFolder = this.folderNameMap.get(entry.name)
      if (matchedFolder) {
        const dest = path.join(this.targetPath, matchedFolder, entry.name)
        if (moveDir(path.join(this.targetPath, entry.name), dest, this.logger)) {
          movedDirectories++
          this.logger(`[->] ${entry.name}/ -> ${matchedFolder}/`)
        } else {
          errors++
        }
      } else if (this.moveUnmatchedFolders) {
        const dest = path.join(this.targetPath, this.unmatchedFolderDest, entry.name)
        if (moveDir(path.join(this.targetPath, entry.name), dest, this.logger)) {
          movedDirectories++
          this.logger(`[->] ${entry.name}/ -> ${this.unmatchedFolderDest}/`)
        } else {
          errors++
        }
      }
    }

    if (deferredFiles === 0) {
      this.logger(`Done organizing ${this.targetPath}!`)
    }

    return { createdFolders, movedFiles, movedDirectories, deferredFiles, errors }
  }
}

function buildExtensionMap(rules: RuleSet['fileRules']): Map<string, string> {
  const map = new Map<string, string>()
  for (const rule of rules) {
    const ext = rule.extension.toLowerCase()
    if (!map.has(ext)) map.set(ext, rule.folder)
  }
  return map
}

function buildFolderNameMap(rules: RuleSet['folderRules']): Map<string, string> {
  const map = new Map<string, string>()
  for (const rule of rules) {
    if (!map.has(rule.name)) map.set(rule.name, rule.folder)
  }
  return map
}

function isFileReady(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, 'r+')
    fs.closeSync(fd)
    return true
  } catch {
    return false
  }
}

function moveFile(src: string, dest: string, logger: (l: string) => void): boolean {
  try {
    fs.renameSync(src, dest)
    return true
  } catch (err: unknown) {
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

function moveDir(src: string, dest: string, logger: (l: string) => void): boolean {
  if (fs.existsSync(dest)) {
    logger(`[!] Destination already exists, skipping folder: ${path.basename(dest)}`)
    return false
  }
  try {
    fs.renameSync(src, dest)
    return true
  } catch (err) {
    logger(`[!] Failed to move folder ${path.basename(src)}: ${err}`)
    return false
  }
}

function isExdevError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as NodeJS.ErrnoException).code === 'EXDEV'
}
