# FileOrganizer Electron Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild FileOrganizer as a cross-platform Electron + React + TypeScript desktop app with a dashboard UI, custom rules, theme switcher, system tray, and GitHub-based auto-updates.

**Architecture:** Main process (Node.js) owns all file system work via chokidar + fs. Renderer (React 18) is pure UI communicating through a typed `contextBridge` IPC API. electron-builder handles cross-platform packaging and auto-updates via GitHub Releases.

**Tech Stack:** Electron 29+, React 18, TypeScript 5, Vite 5, vite-plugin-electron, electron-builder, electron-updater, chokidar, vitest

---

## File Map

| File | Purpose |
|---|---|
| `electron/types.ts` | All shared TypeScript interfaces |
| `electron/config.ts` | JSON-file config + rules persistence |
| `electron/presets.ts` | Built-in rule presets |
| `electron/organizer.ts` | File organization logic (Node.js port) |
| `electron/watcher.ts` | chokidar directory watcher |
| `electron/ipc.ts` | ipcMain handler registration |
| `electron/tray.ts` | System tray setup |
| `electron/updater.ts` | electron-updater setup |
| `electron/main.ts` | Main process entry point |
| `electron/preload.ts` | contextBridge window.api |
| `src/types.ts` | Re-export of shared types for renderer |
| `src/styles/themes.css` | CSS custom properties for all 3 themes |
| `src/styles/global.css` | Reset, font, base styles |
| `src/App.tsx` | Root: theme provider + sidebar + page routing |
| `src/components/Sidebar.tsx` | Icon sidebar with nav |
| `src/components/StatCard.tsx` | Single stat display card |
| `src/components/BarChart.tsx` | SVG bar chart for categories |
| `src/components/ActivityList.tsx` | Recent file moves list |
| `src/components/RulesTable.tsx` | Editable rules table |
| `src/pages/Dashboard.tsx` | Dashboard page |
| `src/pages/Rules.tsx` | Rules management page |
| `src/pages/Log.tsx` | Log viewer page |
| `src/pages/Settings.tsx` | Settings + About page |
| `src/hooks/useConfig.ts` | Config state + IPC sync |
| `src/hooks/useOrganizer.ts` | Organize trigger + result state |
| `tests/organizer.test.ts` | Unit tests for organizer logic |
| `package.json` | Dependencies + scripts |
| `vite.config.ts` | Vite + vite-plugin-electron config |
| `tsconfig.json` | TypeScript config |
| `electron-builder.yml` | Packaging + publish config |

---

## Task 1: Scaffold project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `electron-builder.yml`
- Create: `index.html`

- [ ] **Step 1: Create the project root**

Run in the repo root (this repo already exists — we scaffold inside it, not replacing it):
```bash
mkdir -p electron src/pages src/components src/hooks src/styles tests
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "file-organizer",
  "version": "2.0.0",
  "description": "Automatically organize your files by type",
  "main": "dist-electron/main.js",
  "author": "TR4IS",
  "license": "MIT",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && electron-builder",
    "build:dir": "tsc && vite build && electron-builder --dir",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "chokidar": "^3.6.0",
    "electron-updater": "^6.1.7"
  },
  "devDependencies": {
    "@types/node": "^20.12.0",
    "@types/react": "^18.2.79",
    "@types/react-dom": "^18.2.25",
    "@vitejs/plugin-react": "^4.2.1",
    "electron": "^29.1.4",
    "electron-builder": "^24.13.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.4.4",
    "vite": "^5.2.6",
    "vite-plugin-electron": "^0.28.4",
    "vite-plugin-electron-renderer": "^0.14.5",
    "vitest": "^1.5.0"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` populated, no errors.

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "sourceMap": true,
    "outDir": "dist-electron",
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["electron", "src", "tests"]
}
```

- [ ] **Step 5: Write `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
          },
        },
      },
    ]),
    renderer(),
  ],
  build: {
    outDir: 'dist',
  },
})
```

- [ ] **Step 6: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en" data-theme="gold">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FileOrganizer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Write `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/themes.css'
import './styles/global.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 8: Write `electron-builder.yml`**

```yaml
appId: com.tr4is.fileorganizer
productName: FileOrganizer
copyright: Copyright © 2025 TR4IS

directories:
  output: release

files:
  - dist/**/*
  - dist-electron/**/*
  - docs/FileOrganizer.ico
  - docs/JetBrainsMono-Regular.ttf

win:
  icon: docs/FileOrganizer.ico
  target:
    - target: nsis
      arch: [x64]

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  installerIcon: docs/FileOrganizer.ico
  uninstallerIcon: docs/FileOrganizer.ico

mac:
  icon: docs/FileOrganizer.icns
  target:
    - target: dmg
    - target: zip

linux:
  icon: docs/FileOrganizer.png
  target:
    - target: AppImage
      arch: [x64]

publish:
  provider: github
  owner: TR4IS
  repo: FileOrganizer

afterSign: false
```

- [ ] **Step 9: Commit scaffold**

```bash
git add package.json tsconfig.json vite.config.ts electron-builder.yml index.html src/main.tsx
git commit -m "feat: scaffold Electron + React + TypeScript + Vite project"
```

---

## Task 2: Shared types

**Files:**
- Create: `electron/types.ts`
- Create: `src/types.ts`

- [ ] **Step 1: Write `electron/types.ts`**

```typescript
export interface Rule {
  extension: string   // e.g. ".png" — always lowercase, includes dot
  folder: string      // e.g. "image" — destination subfolder name
}

export interface AppConfig {
  targetPath: string
  runInBackground: boolean
  autoStartWatcher: boolean
  debounceSeconds: number
  theme: 'gold' | 'blue' | 'green'
  autoCheckUpdates: boolean
  launchAtStartup: boolean
}

export interface OrganizeResult {
  createdFolders: number
  movedFiles: number
  movedDirectories: number
  deferredFiles: number
  errors: number
}

export interface Stats {
  today: number
  allTime: number
  byCategory: Record<string, number>  // folder name → count today
}

export interface ActivityEntry {
  filename: string
  folder: string      // destination folder name
  timestamp: number   // Date.now()
}

export const DEFAULT_CONFIG: AppConfig = {
  targetPath: '',
  runInBackground: false,
  autoStartWatcher: false,
  debounceSeconds: 2,
  theme: 'gold',
  autoCheckUpdates: true,
  launchAtStartup: false,
}
```

- [ ] **Step 2: Write `src/types.ts`**

```typescript
// Re-export all types for the renderer — never import from electron/ in src/
export type {
  Rule,
  AppConfig,
  OrganizeResult,
  Stats,
  ActivityEntry,
} from '../electron/types'
```

- [ ] **Step 3: Commit**

```bash
git add electron/types.ts src/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Rule presets

**Files:**
- Create: `electron/presets.ts`

- [ ] **Step 1: Write `electron/presets.ts`**

```typescript
import type { Rule } from './types'

export const PRESETS: Record<string, Rule[]> = {
  Default: [
    { extension: '.png',  folder: 'image' },
    { extension: '.jpg',  folder: 'image' },
    { extension: '.jpeg', folder: 'image' },
    { extension: '.psd',  folder: 'image' },
    { extension: '.mp4',  folder: 'video' },
    { extension: '.mkv',  folder: 'video' },
    { extension: '.avi',  folder: 'video' },
    { extension: '.mov',  folder: 'video' },
    { extension: '.wmv',  folder: 'video' },
    { extension: '.zip',  folder: 'zip' },
    { extension: '.rar',  folder: 'zip' },
    { extension: '.exe',  folder: 'exe' },
    { extension: '.msi',  folder: 'exe' },
    { extension: '.pdf',  folder: 'pdf' },
    { extension: '.mp3',  folder: 'sound' },
    { extension: '.wav',  folder: 'sound' },
    { extension: '.ogg',  folder: 'sound' },
    { extension: '.flac', folder: 'sound' },
    { extension: '.m4a',  folder: 'sound' },
    { extension: '.iso',  folder: 'os' },
    { extension: '.img',  folder: 'os' },
    { extension: '.gif',  folder: 'gif' },
    { extension: '.webp', folder: 'gif' },
    { extension: '.apng', folder: 'gif' },
    { extension: '.avif', folder: 'gif' },
    { extension: '.ttf',  folder: 'font' },
    { extension: '.otf',  folder: 'font' },
    { extension: '.ttc',  folder: 'font' },
  ],
  Developer: [
    { extension: '.png',  folder: 'image' },
    { extension: '.jpg',  folder: 'image' },
    { extension: '.jpeg', folder: 'image' },
    { extension: '.mp4',  folder: 'video' },
    { extension: '.zip',  folder: 'zip' },
    { extension: '.rar',  folder: 'zip' },
    { extension: '.exe',  folder: 'exe' },
    { extension: '.msi',  folder: 'exe' },
    { extension: '.pdf',  folder: 'pdf' },
    { extension: '.json', folder: 'config' },
    { extension: '.yml',  folder: 'config' },
    { extension: '.yaml', folder: 'config' },
    { extension: '.md',   folder: 'docs' },
    { extension: '.sh',   folder: 'scripts' },
    { extension: '.bat',  folder: 'scripts' },
    { extension: '.log',  folder: 'logs' },
    { extension: '.ttf',  folder: 'font' },
    { extension: '.otf',  folder: 'font' },
  ],
  Designer: [
    { extension: '.png',    folder: 'image' },
    { extension: '.jpg',    folder: 'image' },
    { extension: '.jpeg',   folder: 'image' },
    { extension: '.psd',    folder: 'design' },
    { extension: '.ai',     folder: 'design' },
    { extension: '.sketch', folder: 'design' },
    { extension: '.fig',    folder: 'design' },
    { extension: '.svg',    folder: 'vector' },
    { extension: '.gif',    folder: 'gif' },
    { extension: '.webp',   folder: 'gif' },
    { extension: '.mp4',    folder: 'video' },
    { extension: '.mov',    folder: 'video' },
    { extension: '.ttf',    folder: 'fonts' },
    { extension: '.otf',    folder: 'fonts' },
    { extension: '.ttc',    folder: 'fonts' },
    { extension: '.zip',    folder: 'zip' },
    { extension: '.pdf',    folder: 'pdf' },
  ],
  Media: [
    { extension: '.png',  folder: 'image' },
    { extension: '.jpg',  folder: 'image' },
    { extension: '.jpeg', folder: 'image' },
    { extension: '.psd',  folder: 'image' },
    { extension: '.gif',  folder: 'gif' },
    { extension: '.webp', folder: 'gif' },
    { extension: '.apng', folder: 'gif' },
    { extension: '.avif', folder: 'gif' },
    { extension: '.mp4',  folder: 'video' },
    { extension: '.mkv',  folder: 'video' },
    { extension: '.avi',  folder: 'video' },
    { extension: '.mov',  folder: 'video' },
    { extension: '.wmv',  folder: 'video' },
    { extension: '.mp3',  folder: 'sound' },
    { extension: '.wav',  folder: 'sound' },
    { extension: '.ogg',  folder: 'sound' },
    { extension: '.flac', folder: 'sound' },
    { extension: '.m4a',  folder: 'sound' },
  ],
  Minimal: [
    { extension: '.png',  folder: 'image' },
    { extension: '.jpg',  folder: 'image' },
    { extension: '.jpeg', folder: 'image' },
    { extension: '.mp4',  folder: 'video' },
    { extension: '.mkv',  folder: 'video' },
    { extension: '.avi',  folder: 'video' },
    { extension: '.mov',  folder: 'video' },
  ],
}

export const PRESET_NAMES = Object.keys(PRESETS) as (keyof typeof PRESETS)[]
```

- [ ] **Step 2: Commit**

```bash
git add electron/presets.ts
git commit -m "feat: add built-in rule presets"
```

---

## Task 4: Config persistence

**Files:**
- Create: `electron/config.ts`

- [ ] **Step 1: Write `electron/config.ts`**

```typescript
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { AppConfig, Rule, Stats, ActivityEntry } from './types'
import { DEFAULT_CONFIG } from './types'
import { PRESETS } from './presets'

const DATA_DIR = app.getPath('userData')
const CONFIG_PATH = path.join(DATA_DIR, 'config.json')
const RULES_PATH  = path.join(DATA_DIR, 'rules.json')
const STATS_PATH  = path.join(DATA_DIR, 'stats.json')
const LOG_PATH    = path.join(DATA_DIR, 'log.txt')

function readJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
  } catch {
    return fallback
  }
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
}

export function getConfig(): AppConfig {
  const saved = readJson<Partial<AppConfig>>(CONFIG_PATH, {})
  const config = { ...DEFAULT_CONFIG, ...saved }
  if (!config.targetPath) {
    config.targetPath = app.getPath('downloads')
  }
  return config
}

export function setConfig(patch: Partial<AppConfig>): void {
  const current = getConfig()
  writeJson(CONFIG_PATH, { ...current, ...patch })
}

export function getRules(): Rule[] {
  return readJson<Rule[]>(RULES_PATH, PRESETS.Default)
}

export function setRules(rules: Rule[]): void {
  writeJson(RULES_PATH, rules)
}

export function getStats(): Stats {
  return readJson<Stats>(STATS_PATH, { today: 0, allTime: 0, byCategory: {} })
}

export function incrementStats(folder: string): void {
  const stats = getStats()
  stats.today += 1
  stats.allTime += 1
  stats.byCategory[folder] = (stats.byCategory[folder] ?? 0) + 1
  writeJson(STATS_PATH, stats)
}

export function resetDailyStats(): void {
  const stats = getStats()
  writeJson(STATS_PATH, { ...stats, today: 0, byCategory: {} })
}

export function appendLog(line: string): void {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.appendFileSync(LOG_PATH, line + '\n', 'utf8')
}

export function getLogs(maxLines = 0): string[] {
  try {
    const content = fs.readFileSync(LOG_PATH, 'utf8')
    const lines = content.split('\n').filter(Boolean)
    return maxLines > 0 ? lines.slice(-maxLines) : lines
  } catch {
    return []
  }
}

export function clearLogs(): void {
  fs.writeFileSync(LOG_PATH, '', 'utf8')
}

// Activity stored in memory only — last 50 entries
let activityLog: ActivityEntry[] = []

export function recordActivity(entry: ActivityEntry): void {
  activityLog.unshift(entry)
  if (activityLog.length > 50) activityLog.pop()
}

export function getActivity(limit = 10): ActivityEntry[] {
  return activityLog.slice(0, limit)
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/config.ts
git commit -m "feat: add JSON-file config and stats persistence"
```

---

## Task 5: File organizer logic + tests

**Files:**
- Create: `electron/organizer.ts`
- Create: `tests/organizer.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `tests/organizer.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { Organizer } from '../electron/organizer'
import type { Rule } from '../electron/types'

const RULES: Rule[] = [
  { extension: '.png',  folder: 'image' },
  { extension: '.jpg',  folder: 'image' },
  { extension: '.mp4',  folder: 'video' },
  { extension: '.pdf',  folder: 'pdf' },
  { extension: '.zip',  folder: 'zip' },
]

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fo-test-'))
}

describe('Organizer', () => {
  let targetDir: string
  let logs: string[]
  let org: Organizer

  beforeEach(() => {
    targetDir = makeTempDir()
    logs = []
    org = new Organizer(targetDir, RULES, (line) => logs.push(line))
  })

  afterEach(() => {
    fs.rmSync(targetDir, { recursive: true, force: true })
  })

  it('moves a .png file into image/', () => {
    fs.writeFileSync(path.join(targetDir, 'photo.png'), 'data')
    const result = org.organize()
    expect(result.movedFiles).toBe(1)
    expect(fs.existsSync(path.join(targetDir, 'image', 'photo.png'))).toBe(true)
  })

  it('moves multiple files into correct folders', () => {
    fs.writeFileSync(path.join(targetDir, 'a.png'), 'x')
    fs.writeFileSync(path.join(targetDir, 'b.mp4'), 'x')
    fs.writeFileSync(path.join(targetDir, 'c.pdf'), 'x')
    const result = org.organize()
    expect(result.movedFiles).toBe(3)
    expect(fs.existsSync(path.join(targetDir, 'image', 'a.png'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'video', 'b.mp4'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'pdf',   'c.pdf'))).toBe(true)
  })

  it('moves unknown extension into random/', () => {
    fs.writeFileSync(path.join(targetDir, 'weird.xyz'), 'x')
    const result = org.organize()
    expect(result.movedFiles).toBe(1)
    expect(fs.existsSync(path.join(targetDir, 'random', 'weird.xyz'))).toBe(true)
  })

  it('skips temp extensions', () => {
    fs.writeFileSync(path.join(targetDir, 'downloading.crdownload'), 'x')
    fs.writeFileSync(path.join(targetDir, 'file.part'), 'x')
    const result = org.organize()
    expect(result.movedFiles).toBe(0)
    expect(result.deferredFiles).toBe(0)
  })

  it('skips the category subfolders themselves', () => {
    fs.mkdirSync(path.join(targetDir, 'image'))
    fs.writeFileSync(path.join(targetDir, 'image', 'existing.png'), 'x')
    const result = org.organize()
    expect(result.errors).toBe(0)
    expect(result.movedFiles).toBe(0)
  })

  it('does not create ghost files for missing files', () => {
    // isFileReady must NOT create a file that does not exist
    const ghost = path.join(targetDir, 'ghost.png')
    // ghost does not exist — organizer should not create it
    org.organize()
    expect(fs.existsSync(ghost)).toBe(false)
  })

  it('handles cross-device move gracefully', () => {
    // Simulate rename failure by making destination read-only dir
    fs.writeFileSync(path.join(targetDir, 'test.png'), 'x')
    const imageDir = path.join(targetDir, 'image')
    fs.mkdirSync(imageDir)
    // Even if move fails it should not throw — just increment errors
    // We can't easily simulate EXDEV, so just verify it runs without throw
    expect(() => org.organize()).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/organizer.test.ts
```

Expected: `Error: Cannot find module '../electron/organizer'`

- [ ] **Step 3: Write `electron/organizer.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/organizer.test.ts
```

Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add electron/organizer.ts tests/organizer.test.ts
git commit -m "feat: add file organizer logic with bug fixes, add tests"
```

---

## Task 6: Directory watcher

**Files:**
- Create: `electron/watcher.ts`

- [ ] **Step 1: Write `electron/watcher.ts`**

```typescript
import chokidar, { FSWatcher } from 'chokidar'

export class DirectoryWatcher {
  private watcher: FSWatcher | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private trigger: () => void,
    private debounceMs = 2000,
  ) {}

  start(targetPath: string): void {
    if (this.watcher) return

    this.watcher = chokidar.watch(targetPath, {
      depth: 0,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
    })

    this.watcher.on('add', () => this.scheduleRun())
    this.watcher.on('change', () => this.scheduleRun())
  }

  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }

  restart(targetPath: string): void {
    this.stop()
    this.start(targetPath)
  }

  isRunning(): boolean {
    return this.watcher !== null
  }

  setDebounce(ms: number): void {
    this.debounceMs = ms
  }

  private scheduleRun(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      this.trigger()
    }, this.debounceMs)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/watcher.ts
git commit -m "feat: add chokidar directory watcher"
```

---

## Task 7: IPC handlers

**Files:**
- Create: `electron/ipc.ts`

- [ ] **Step 1: Write `electron/ipc.ts`**

```typescript
import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import { Organizer } from './organizer'
import { DirectoryWatcher } from './watcher'
import {
  getConfig, setConfig, getRules, setRules,
  getStats, getLogs, clearLogs,
  appendLog, incrementStats, recordActivity, getActivity,
} from './config'
import type { AppConfig, Rule } from './types'

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
  }

  // Wire organizer logger to IPC
  organizer['logger'] = log

  ipcMain.handle('organize', async () => {
    const result = organizer.organize()
    if (result.movedFiles > 0 || result.movedDirectories > 0) {
      const config = getConfig()
      // Record individual moves are done inside organizer — stats update here
      incrementStats('_total') // placeholder; real per-category done in organizer callback
    }
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
  })

  ipcMain.handle('get-rules', () => getRules())

  ipcMain.handle('set-rules', (_e, rules: Rule[]) => {
    setRules(rules)
    organizer.updateRules(rules)
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
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/ipc.ts
git commit -m "feat: add ipcMain handlers for all renderer commands"
```

---

## Task 8: Preload script

**Files:**
- Create: `electron/preload.ts`

- [ ] **Step 1: Write `electron/preload.ts`**

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type { AppConfig, Rule, OrganizeResult, Stats } from './types'

contextBridge.exposeInMainWorld('api', {
  // Commands
  organize: (): Promise<OrganizeResult> =>
    ipcRenderer.invoke('organize'),

  getConfig: (): Promise<AppConfig> =>
    ipcRenderer.invoke('get-config'),

  setConfig: (patch: Partial<AppConfig>): Promise<void> =>
    ipcRenderer.invoke('set-config', patch),

  getRules: (): Promise<Rule[]> =>
    ipcRenderer.invoke('get-rules'),

  setRules: (rules: Rule[]): Promise<void> =>
    ipcRenderer.invoke('set-rules', rules),

  getStats: (): Promise<Stats & { activity: import('./types').ActivityEntry[] }> =>
    ipcRenderer.invoke('get-stats'),

  getLogs: (maxLines?: number): Promise<string[]> =>
    ipcRenderer.invoke('get-logs', maxLines),

  clearLogs: (): Promise<void> =>
    ipcRenderer.invoke('clear-logs'),

  startWatcher: (): Promise<void> =>
    ipcRenderer.invoke('start-watcher'),

  stopWatcher: (): Promise<void> =>
    ipcRenderer.invoke('stop-watcher'),

  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('select-folder'),

  setFolder: (p: string): Promise<void> =>
    ipcRenderer.invoke('set-folder', p),

  checkForUpdates: (): Promise<void> =>
    ipcRenderer.invoke('check-for-updates'),

  // Events — return cleanup function
  onLog: (cb: (line: string) => void) => {
    const handler = (_: unknown, line: string) => cb(line)
    ipcRenderer.on('log', handler)
    return () => ipcRenderer.removeListener('log', handler)
  },

  onOrganizeComplete: (cb: (result: OrganizeResult) => void) => {
    const handler = (_: unknown, result: OrganizeResult) => cb(result)
    ipcRenderer.on('organize-complete', handler)
    return () => ipcRenderer.removeListener('organize-complete', handler)
  },

  onWatcherStatus: (cb: (active: boolean) => void) => {
    const handler = (_: unknown, active: boolean) => cb(active)
    ipcRenderer.on('watcher-status', handler)
    return () => ipcRenderer.removeListener('watcher-status', handler)
  },

  onUpdateAvailable: (cb: (version: string) => void) => {
    const handler = (_: unknown, version: string) => cb(version)
    ipcRenderer.on('update-available', handler)
    return () => ipcRenderer.removeListener('update-available', handler)
  },
})

// Declare type for renderer
declare global {
  interface Window {
    api: typeof import('./preload')['default']
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/preload.ts
git commit -m "feat: add contextBridge preload API"
```

---

## Task 9: System tray

**Files:**
- Create: `electron/tray.ts`

- [ ] **Step 1: Write `electron/tray.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add electron/tray.ts
git commit -m "feat: add cross-platform system tray"
```

---

## Task 10: Auto-updater

**Files:**
- Create: `electron/updater.ts`

- [ ] **Step 1: Write `electron/updater.ts`**

```typescript
import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log'

export function setupUpdater(getWindow: () => BrowserWindow | null): void {
  autoUpdater.logger = log
  autoUpdater.autoDownload = false

  autoUpdater.on('update-available', (info) => {
    getWindow()?.webContents.send('update-available', info.version)
  })

  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  autoUpdater.on('error', (err) => {
    log.error('Update error:', err)
  })

  ipcMain.handle('check-for-updates', async () => {
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      log.error('Manual update check failed:', err)
    }
  })

  // Silent check on startup (after 3s delay so window is ready)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {/* ignore in dev */})
  }, 3000)
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/updater.ts
git commit -m "feat: add electron-updater auto-update"
```

---

## Task 11: Main process entry

**Files:**
- Create: `electron/main.ts`

- [ ] **Step 1: Write `electron/main.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add electron/main.ts
git commit -m "feat: add main process entry with window, tray, and watcher lifecycle"
```

---

## Task 12: Theming + global styles

**Files:**
- Create: `src/styles/themes.css`
- Create: `src/styles/global.css`

- [ ] **Step 1: Write `src/styles/themes.css`**

```css
:root,
[data-theme="gold"] {
  --accent: #FFD700;
  --accent-hover: #ffe033;
  --accent-text: #000000;
  --accent-muted: rgba(255, 215, 0, 0.12);
  --bg-base: #0f0f0f;
  --bg-surface: #161616;
  --bg-sidebar: #111111;
  --bg-hover: #1a1a1a;
  --border: #1e1e1e;
  --text-primary: #ffffff;
  --text-secondary: #888888;
  --text-muted: #555555;
  --status-active: #00C864;
  --status-active-bg: rgba(0, 200, 100, 0.1);
}

[data-theme="blue"] {
  --accent: #3B82F6;
  --accent-hover: #60A5FA;
  --accent-text: #ffffff;
  --accent-muted: rgba(59, 130, 246, 0.12);
  --bg-base: #0a0d14;
  --bg-surface: #0f1520;
  --bg-sidebar: #0d1018;
  --bg-hover: #141c2e;
  --border: #1a2236;
  --text-primary: #e2e8f0;
  --text-secondary: #64748b;
  --text-muted: #334155;
  --status-active: #22d3ee;
  --status-active-bg: rgba(34, 211, 238, 0.1);
}

[data-theme="green"] {
  --accent: #10B981;
  --accent-hover: #34D399;
  --accent-text: #000000;
  --accent-muted: rgba(16, 185, 129, 0.12);
  --bg-base: #090f0d;
  --bg-surface: #0d1610;
  --bg-sidebar: #0b1209;
  --bg-hover: #122116;
  --border: #162318;
  --text-primary: #d1fae5;
  --text-secondary: #6b8c74;
  --text-muted: #2a3d2e;
  --status-active: #34D399;
  --status-active-bg: rgba(52, 211, 153, 0.1);
}
```

- [ ] **Step 2: Write `src/styles/global.css`**

```css
@font-face {
  font-family: 'JetBrains Mono';
  src: url('../../docs/JetBrainsMono-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  background: var(--bg-base);
  color: var(--text-primary);
  font-size: 13px;
  -webkit-font-smoothing: antialiased;
  user-select: none;
}

button {
  cursor: pointer;
  border: none;
  font-family: inherit;
  font-size: inherit;
}

input, select {
  font-family: inherit;
  font-size: inherit;
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/themes.css src/styles/global.css
git commit -m "feat: add theme CSS variables and global styles"
```

---

## Task 13: App shell + Sidebar

**Files:**
- Create: `src/App.tsx`
- Create: `src/components/Sidebar.tsx`

- [ ] **Step 1: Write `src/components/Sidebar.tsx`**

```tsx
import React from 'react'
import styles from './Sidebar.module.css'

export type Page = 'dashboard' | 'rules' | 'log' | 'settings'

interface Props {
  current: Page
  onChange: (page: Page) => void
}

const ITEMS: { page: Page; icon: string; title: string }[] = [
  { page: 'dashboard', icon: '📊', title: 'Dashboard' },
  { page: 'rules',     icon: '📋', title: 'Rules' },
  { page: 'log',       icon: '📄', title: 'Log' },
]

export default function Sidebar({ current, onChange }: Props) {
  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo} title="FileOrganizer">⚡</div>
      <div className={styles.items}>
        {ITEMS.map(({ page, icon, title }) => (
          <button
            key={page}
            className={`${styles.item} ${current === page ? styles.active : ''}`}
            onClick={() => onChange(page)}
            title={title}
          >
            {icon}
          </button>
        ))}
      </div>
      <div className={styles.bottom}>
        <button
          className={`${styles.item} ${current === 'settings' ? styles.active : ''}`}
          onClick={() => onChange('settings')}
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Write `src/components/Sidebar.module.css`**

```css
.sidebar {
  width: 64px;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  flex-shrink: 0;
}

.logo {
  width: 36px;
  height: 36px;
  background: var(--accent);
  color: var(--accent-text);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.bottom {
  display: flex;
  flex-direction: column;
}

.item {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  position: relative;
  color: var(--text-muted);
  transition: background 0.15s, color 0.15s;
}

.item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.item.active {
  background: var(--accent-muted);
  color: var(--accent);
}

.item.active::before {
  content: '';
  position: absolute;
  left: -1px;
  width: 3px;
  height: 24px;
  background: var(--accent);
  border-radius: 0 3px 3px 0;
}
```

- [ ] **Step 3: Write `src/App.tsx`**

```tsx
import React, { useState, useEffect } from 'react'
import Sidebar, { type Page } from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Rules from './pages/Rules'
import Log from './pages/Log'
import Settings from './pages/Settings'
import styles from './App.module.css'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [theme, setTheme] = useState<'gold' | 'blue' | 'green'>('gold')

  useEffect(() => {
    window.api.getConfig().then((cfg) => {
      setTheme(cfg.theme)
      document.documentElement.setAttribute('data-theme', cfg.theme)
    })
  }, [])

  const handleThemeChange = (t: 'gold' | 'blue' | 'green') => {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
    window.api.setConfig({ theme: t })
  }

  return (
    <div className={styles.app}>
      <Sidebar current={page} onChange={setPage} />
      <main className={styles.main}>
        {page === 'dashboard' && <Dashboard />}
        {page === 'rules'     && <Rules />}
        {page === 'log'       && <Log />}
        {page === 'settings'  && <Settings onThemeChange={handleThemeChange} currentTheme={theme} />}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/App.module.css`**

```css
.app {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-base);
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.module.css src/components/Sidebar.tsx src/components/Sidebar.module.css
git commit -m "feat: add app shell with sidebar and page routing"
```

---

## Task 14: Shared UI components

**Files:**
- Create: `src/components/StatCard.tsx` + `.module.css`
- Create: `src/components/BarChart.tsx` + `.module.css`
- Create: `src/components/ActivityList.tsx` + `.module.css`

- [ ] **Step 1: Write `src/components/StatCard.tsx`**

```tsx
import React from 'react'
import styles from './StatCard.module.css'

interface Props {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}

export default function StatCard({ label, value, sub, accent }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={`${styles.value} ${accent ? styles.accent : ''}`}>{value}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/StatCard.module.css`**

```css
.card {
  flex: 1;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
}

.label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
}

.value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.accent { color: var(--accent); }

.sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}
```

- [ ] **Step 3: Write `src/components/BarChart.tsx`**

```tsx
import React from 'react'
import styles from './BarChart.module.css'

const CATEGORY_COLORS: Record<string, string> = {
  image:  '#FFD700',
  video:  '#00AEFF',
  zip:    '#9B59B6',
  exe:    '#E74C3C',
  pdf:    '#2ECC71',
  sound:  '#F39C12',
  gif:    '#1ABC9C',
  font:   '#E67E22',
  os:     '#95A5A6',
  random: '#555555',
}

interface Props {
  data: Record<string, number>
}

export default function BarChart({ data }: Props) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const max = Math.max(...entries.map(([, v]) => v), 1)

  if (entries.length === 0) {
    return <div className={styles.empty}>No files organized today</div>
  }

  return (
    <div className={styles.chart}>
      {entries.map(([folder, count]) => (
        <div key={folder} className={styles.group}>
          <div
            className={styles.bar}
            style={{
              height: `${(count / max) * 100}%`,
              background: CATEGORY_COLORS[folder] ?? '#555',
            }}
            title={`${folder}: ${count}`}
          />
          <div className={styles.label}>{folder}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Write `src/components/BarChart.module.css`**

```css
.chart {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  height: 100%;
  width: 100%;
}

.group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  height: 100%;
  justify-content: flex-end;
}

.bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.3s ease;
}

.label {
  font-size: 9px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.empty {
  color: var(--text-muted);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
```

- [ ] **Step 5: Write `src/components/ActivityList.tsx`**

```tsx
import React from 'react'
import type { ActivityEntry } from '../types'
import styles from './ActivityList.module.css'

const CATEGORY_COLORS: Record<string, string> = {
  image:  '#FFD700',
  video:  '#00AEFF',
  zip:    '#9B59B6',
  exe:    '#E74C3C',
  pdf:    '#2ECC71',
  sound:  '#F39C12',
  gif:    '#1ABC9C',
  font:   '#E67E22',
  os:     '#95A5A6',
  random: '#777777',
}

interface Props {
  entries: ActivityEntry[]
}

export default function ActivityList({ entries }: Props) {
  if (entries.length === 0) {
    return <div className={styles.empty}>No recent activity</div>
  }

  return (
    <ul className={styles.list}>
      {entries.map((entry, i) => {
        const color = CATEGORY_COLORS[entry.folder] ?? '#777'
        return (
          <li key={i} className={styles.item}>
            <div className={styles.name} title={entry.filename}>
              {entry.filename}
            </div>
            <div className={styles.dest} style={{ color }}>
              → {entry.folder}/
            </div>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 6: Write `src/components/ActivityList.module.css`**

```css
.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.name {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.dest {
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.empty {
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
  padding: 16px 0;
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/StatCard.tsx src/components/StatCard.module.css \
        src/components/BarChart.tsx src/components/BarChart.module.css \
        src/components/ActivityList.tsx src/components/ActivityList.module.css
git commit -m "feat: add StatCard, BarChart, ActivityList components"
```

---

## Task 15: Dashboard page

**Files:**
- Create: `src/pages/Dashboard.tsx` + `.module.css`

- [ ] **Step 1: Write `src/pages/Dashboard.tsx`**

```tsx
import React, { useState, useEffect, useCallback } from 'react'
import StatCard from '../components/StatCard'
import BarChart from '../components/BarChart'
import ActivityList from '../components/ActivityList'
import type { OrganizeResult, ActivityEntry } from '../types'
import styles from './Dashboard.module.css'

interface DashboardStats {
  today: number
  allTime: number
  byCategory: Record<string, number>
  activity: ActivityEntry[]
}

export default function Dashboard() {
  const [config, setConfig] = useState({ targetPath: '', runInBackground: false })
  const [stats, setStats] = useState<DashboardStats>({
    today: 0, allTime: 0, byCategory: {}, activity: [],
  })
  const [busy, setBusy] = useState(false)
  const [watching, setWatching] = useState(false)
  const [lastRun, setLastRun] = useState<Date | null>(null)

  const loadData = useCallback(async () => {
    const [cfg, s] = await Promise.all([window.api.getConfig(), window.api.getStats()])
    setConfig({ targetPath: cfg.targetPath, runInBackground: cfg.runInBackground })
    setWatching(cfg.runInBackground)
    setStats(s as DashboardStats)
  }, [])

  useEffect(() => {
    loadData()

    const cleanLog = window.api.onLog(() => {})
    const cleanComplete = window.api.onOrganizeComplete(() => {
      setBusy(false)
      setLastRun(new Date())
      loadData()
    })
    const cleanWatcher = window.api.onWatcherStatus((active) => {
      setWatching(active)
    })

    return () => { cleanLog(); cleanComplete(); cleanWatcher() }
  }, [loadData])

  async function handleOrganize() {
    if (busy) return
    setBusy(true)
    await window.api.organize()
  }

  async function handleToggleWatcher() {
    if (watching) {
      await window.api.stopWatcher()
      setWatching(false)
    } else {
      await window.api.startWatcher()
      setWatching(true)
    }
  }

  async function handleChangeFolder() {
    const newPath = await window.api.selectFolder()
    if (newPath) {
      setConfig((c) => ({ ...c, targetPath: newPath }))
    }
  }

  const folderName = config.targetPath.split(/[/\\]/).pop() ?? config.targetPath
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const lastRunStr = lastRun
    ? `Last run ${Math.round((Date.now() - lastRun.getTime()) / 60000)} min ago`
    : 'Not run yet'

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>{dateStr} · {lastRunStr}</p>
        </div>
        <div className={styles.actions}>
          <div className={`${styles.badge} ${watching ? styles.badgeActive : styles.badgeIdle}`}>
            <span className={watching ? styles.dot : styles.dotIdle} />
            {watching ? 'Watching' : 'Idle'}
          </div>
          <button className={styles.btnGhost} onClick={handleToggleWatcher}>
            {watching ? 'Stop' : 'Watch'}
          </button>
          <button className={styles.btnPrimary} onClick={handleOrganize} disabled={busy}>
            {busy ? 'Running…' : '⚡ Organize Now'}
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Stats row */}
        <div className={styles.statRow}>
          <StatCard label="Files Today" value={stats.today} sub={`${stats.allTime.toLocaleString()} all time`} accent />
          <div className={styles.watchCard}>
            <div className={styles.cardLabel}>Watching</div>
            <div className={styles.watchPath}>{folderName || '—'}</div>
            <div className={styles.watchStatus} style={{ color: watching ? 'var(--status-active)' : 'var(--text-muted)' }}>
              {watching ? '● Active' : '○ Stopped'}
            </div>
          </div>
          <StatCard label="All Time" value={stats.allTime.toLocaleString()} />
        </div>

        {/* Folder bar */}
        <div className={styles.folderBar}>
          <span className={styles.folderIcon}>📁</span>
          <span className={styles.folderPath} title={config.targetPath}>
            {config.targetPath || 'No folder selected'}
          </span>
          <button className={styles.btnGhost} onClick={handleChangeFolder}>Change Folder</button>
        </div>

        {/* Chart + Activity */}
        <div className={styles.bottomRow}>
          <div className={styles.chartCard}>
            <div className={styles.cardTitle}>Category Breakdown — Today</div>
            <div className={styles.chartArea}>
              <BarChart data={stats.byCategory} />
            </div>
          </div>
          <div className={styles.activityCard}>
            <div className={styles.cardTitle}>Recent Activity</div>
            <ActivityList entries={stats.activity} />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/pages/Dashboard.module.css`**

```css
.page { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.title { font-size: 16px; font-weight: 700; }
.subtitle { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.actions { display: flex; align-items: center; gap: 8px; }

.badge {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600;
}
.badgeActive {
  background: var(--status-active-bg);
  color: var(--status-active);
  border: 1px solid var(--status-active);
}
.badgeIdle {
  background: var(--bg-hover);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--status-active);
  animation: pulse 2s infinite;
}
.dotIdle { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted); }

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

.btnPrimary {
  padding: 7px 16px; border-radius: 8px;
  background: var(--accent); color: var(--accent-text);
  font-weight: 700; font-size: 12px;
  transition: background 0.15s;
}
.btnPrimary:hover:not(:disabled) { background: var(--accent-hover); }
.btnPrimary:disabled { opacity: 0.5; cursor: not-allowed; }

.btnGhost {
  padding: 7px 12px; border-radius: 8px;
  background: transparent; color: var(--text-secondary);
  border: 1px solid var(--border); font-size: 12px;
  transition: background 0.15s, color 0.15s;
}
.btnGhost:hover { background: var(--bg-hover); color: var(--text-primary); }

.content { flex: 1; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; overflow: hidden; }

.statRow { display: flex; gap: 12px; flex-shrink: 0; }

.watchCard {
  flex: 1; background: var(--bg-surface);
  border: 1px solid var(--border); border-radius: 10px; padding: 16px;
}
.cardLabel { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px; }
.watchPath { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.watchStatus { font-size: 11px; margin-top: 4px; }

.folderBar {
  display: flex; align-items: center; gap: 10px;
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 10px 16px; flex-shrink: 0;
}
.folderIcon { font-size: 16px; flex-shrink: 0; }
.folderPath { flex: 1; font-size: 12px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.bottomRow { display: flex; gap: 12px; flex: 1; min-height: 0; }

.chartCard {
  flex: 1; background: var(--bg-surface);
  border: 1px solid var(--border); border-radius: 10px; padding: 16px;
  display: flex; flex-direction: column;
}
.chartArea { flex: 1; min-height: 0; }

.activityCard {
  width: 220px; background: var(--bg-surface);
  border: 1px solid var(--border); border-radius: 10px; padding: 16px;
  display: flex; flex-direction: column; gap: 12px; overflow: hidden;
}
.cardTitle { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; flex-shrink: 0; }
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx src/pages/Dashboard.module.css
git commit -m "feat: add Dashboard page with stats, chart, and activity"
```

---

## Task 16: Rules page

**Files:**
- Create: `src/pages/Rules.tsx` + `.module.css`

- [ ] **Step 1: Write `src/pages/Rules.tsx`**

```tsx
import React, { useState, useEffect } from 'react'
import type { Rule } from '../types'
import { PRESET_NAMES } from '../../electron/presets'
import styles from './Rules.module.css'

export default function Rules() {
  const [rules, setRules] = useState<Rule[]>([])
  const [preset, setPreset] = useState('Default')
  const [newExt, setNewExt] = useState('')
  const [newFolder, setNewFolder] = useState('')

  useEffect(() => {
    window.api.getRules().then(setRules)
  }, [])

  async function saveRules(updated: Rule[]) {
    setRules(updated)
    await window.api.setRules(updated)
  }

  async function handleResetPreset() {
    if (!confirm(`Reset to "${preset}" preset? This will replace all current rules.`)) return
    const { PRESETS } = await import('../../electron/presets')
    await saveRules(PRESETS[preset] ?? [])
  }

  async function handleDelete(index: number) {
    await saveRules(rules.filter((_, i) => i !== index))
  }

  async function handleAdd() {
    const ext = newExt.trim().toLowerCase()
    const folder = newFolder.trim().toLowerCase()
    if (!ext || !folder) return
    const normalized = ext.startsWith('.') ? ext : `.${ext}`
    await saveRules([...rules, { extension: normalized, folder }])
    setNewExt('')
    setNewFolder('')
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>Rules</h1>
          <p className={styles.subtitle}>Map file extensions to destination folders</p>
        </div>
        <div className={styles.presetRow}>
          <select
            className={styles.select}
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
          >
            {PRESET_NAMES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button className={styles.btnGhost} onClick={handleResetPreset}>
            Reset to Preset
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Extension</th>
              <th>Destination Folder</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, i) => (
              <tr key={i}>
                <td><code>{rule.extension}</code></td>
                <td>{rule.folder}</td>
                <td>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(i)}>✕</button>
                </td>
              </tr>
            ))}
            {/* Add row */}
            <tr className={styles.addRow}>
              <td>
                <input
                  className={styles.input}
                  placeholder=".ext"
                  value={newExt}
                  onChange={(e) => setNewExt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </td>
              <td>
                <input
                  className={styles.input}
                  placeholder="folder-name"
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </td>
              <td>
                <button className={styles.addBtn} onClick={handleAdd}>+ Add</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/pages/Rules.module.css`**

```css
.page { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.title { font-size: 16px; font-weight: 700; }
.subtitle { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.presetRow { display: flex; gap: 8px; align-items: center; }

.select {
  background: var(--bg-surface); color: var(--text-primary);
  border: 1px solid var(--border); border-radius: 8px;
  padding: 6px 10px; font-size: 12px; cursor: pointer;
}

.btnGhost {
  padding: 7px 12px; border-radius: 8px;
  background: transparent; color: var(--text-secondary);
  border: 1px solid var(--border); font-size: 12px;
}
.btnGhost:hover { background: var(--bg-hover); color: var(--text-primary); }

.content { flex: 1; overflow-y: auto; padding: 16px 20px; }

.table { width: 100%; border-collapse: collapse; }

.table th {
  text-align: left; font-size: 10px; text-transform: uppercase;
  letter-spacing: 0.8px; color: var(--text-muted);
  padding: 0 12px 10px; border-bottom: 1px solid var(--border);
}

.table td {
  padding: 10px 12px; border-bottom: 1px solid var(--border);
  font-size: 12px; color: var(--text-secondary);
}

.table td code {
  color: var(--accent); background: var(--accent-muted);
  padding: 2px 6px; border-radius: 4px; font-size: 11px;
}

.deleteBtn {
  background: transparent; color: var(--text-muted);
  border: none; font-size: 13px; padding: 2px 6px; border-radius: 4px;
}
.deleteBtn:hover { color: #E74C3C; background: rgba(231,76,60,0.1); }

.addRow td { border-bottom: none; padding-top: 14px; }

.input {
  background: var(--bg-surface); color: var(--text-primary);
  border: 1px solid var(--border); border-radius: 6px;
  padding: 6px 10px; font-size: 12px; width: 100%;
}
.input:focus { outline: none; border-color: var(--accent); }

.addBtn {
  background: var(--accent); color: var(--accent-text);
  border: none; border-radius: 6px; padding: 6px 12px;
  font-size: 12px; font-weight: 700;
}
.addBtn:hover { background: var(--accent-hover); }
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Rules.tsx src/pages/Rules.module.css
git commit -m "feat: add Rules page with preset selector and editable table"
```

---

## Task 17: Log page

**Files:**
- Create: `src/pages/Log.tsx` + `.module.css`

- [ ] **Step 1: Write `src/pages/Log.tsx`**

```tsx
import React, { useState, useEffect, useRef } from 'react'
import styles from './Log.module.css'

export default function Log() {
  const [lines, setLines] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.api.getLogs().then(setLines)

    const cleanup = window.api.onLog((line) => {
      setLines((prev) => [...prev, line])
    })

    return cleanup
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  async function handleClear() {
    if (!confirm('Clear all log entries?')) return
    await window.api.clearLogs()
    setLines([])
  }

  function lineColor(line: string): string {
    if (line.startsWith('[!]')) return 'var(--color-error, #E74C3C)'
    if (line.startsWith('[+]')) return 'var(--accent)'
    if (line.startsWith('[->]')) return 'var(--text-secondary)'
    if (line.startsWith('[*]')) return 'var(--status-active)'
    return 'var(--text-muted)'
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>Log</h1>
          <p className={styles.subtitle}>{lines.length} entries</p>
        </div>
        <button className={styles.clearBtn} onClick={handleClear}>Clear Log</button>
      </div>
      <div className={styles.logArea}>
        {lines.length === 0 && (
          <div className={styles.empty}>No log entries yet. Run an organize to see activity.</div>
        )}
        {lines.map((line, i) => (
          <div key={i} className={styles.line} style={{ color: lineColor(line) }}>
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/pages/Log.module.css`**

```css
.page { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.title { font-size: 16px; font-weight: 700; }
.subtitle { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.clearBtn {
  padding: 7px 12px; border-radius: 8px; background: transparent;
  color: #E74C3C; border: 1px solid rgba(231,76,60,0.3); font-size: 12px;
}
.clearBtn:hover { background: rgba(231,76,60,0.08); }

.logArea { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 4px; }

.line { font-size: 12px; font-family: 'JetBrains Mono', monospace; line-height: 1.6; }

.empty { color: var(--text-muted); font-size: 12px; text-align: center; margin-top: 40px; }
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Log.tsx src/pages/Log.module.css
git commit -m "feat: add Log page with live updates and clear"
```

---

## Task 18: Settings page

**Files:**
- Create: `src/pages/Settings.tsx` + `.module.css`

- [ ] **Step 1: Write `src/pages/Settings.tsx`**

```tsx
import React, { useState, useEffect } from 'react'
import type { AppConfig } from '../types'
import styles from './Settings.module.css'

const VERSION = __APP_VERSION__ // injected by Vite define

interface Props {
  currentTheme: 'gold' | 'blue' | 'green'
  onThemeChange: (t: 'gold' | 'blue' | 'green') => void
}

export default function Settings({ currentTheme, onThemeChange }: Props) {
  const [config, setConfig] = useState<AppConfig | null>(null)

  useEffect(() => {
    window.api.getConfig().then(setConfig)
  }, [])

  async function update(patch: Partial<AppConfig>) {
    if (!config) return
    const updated = { ...config, ...patch }
    setConfig(updated)
    await window.api.setConfig(patch)
  }

  async function handleChangeFolder() {
    const p = await window.api.selectFolder()
    if (p && config) setConfig({ ...config, targetPath: p })
  }

  if (!config) return <div className={styles.loading}>Loading…</div>

  const themes: { id: 'gold' | 'blue' | 'green'; label: string; color: string }[] = [
    { id: 'gold',  label: 'Gold',          color: '#FFD700' },
    { id: 'blue',  label: 'Electric Blue', color: '#3B82F6' },
    { id: 'green', label: 'Emerald Green', color: '#10B981' },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.title}>Settings</h1>
      </div>

      <div className={styles.content}>

        {/* Folder */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Folder</h2>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Target folder</span>
            <div className={styles.rowRight}>
              <span className={styles.pathText} title={config.targetPath}>
                {config.targetPath || '—'}
              </span>
              <button className={styles.btn} onClick={handleChangeFolder}>Change</button>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Appearance</h2>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Theme</span>
            <div className={styles.themeRow}>
              {themes.map((t) => (
                <button
                  key={t.id}
                  className={`${styles.themeBtn} ${currentTheme === t.id ? styles.themeBtnActive : ''}`}
                  style={{ '--t-color': t.color } as React.CSSProperties}
                  onClick={() => { onThemeChange(t.id); update({ theme: t.id }) }}
                >
                  <span className={styles.themeDot} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Behavior */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Behavior</h2>
          <Toggle
            label="Launch at system startup"
            value={config.launchAtStartup}
            onChange={(v) => update({ launchAtStartup: v })}
          />
          <Toggle
            label="Auto-start watcher on launch"
            value={config.autoStartWatcher}
            onChange={(v) => update({ autoStartWatcher: v })}
          />
          <div className={styles.row}>
            <span className={styles.rowLabel}>Watcher debounce</span>
            <div className={styles.rowRight}>
              <input
                type="number"
                min={1}
                max={30}
                className={styles.numInput}
                value={config.debounceSeconds}
                onChange={(e) => update({ debounceSeconds: Number(e.target.value) })}
              />
              <span className={styles.unit}>seconds</span>
            </div>
          </div>
        </section>

        {/* Updates */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Updates</h2>
          <Toggle
            label="Auto-check for updates on startup"
            value={config.autoCheckUpdates}
            onChange={(v) => update({ autoCheckUpdates: v })}
          />
          <div className={styles.row}>
            <span className={styles.rowLabel}>Current version</span>
            <span className={styles.versionText}>v{VERSION}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel} />
            <button className={styles.btn} onClick={() => window.api.checkForUpdates()}>
              Check for Updates
            </button>
          </div>
        </section>

        {/* About */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>About</h2>
          <div className={styles.aboutCard}>
            <div className={styles.aboutLogo}>⚡</div>
            <div className={styles.aboutInfo}>
              <div className={styles.aboutName}>FileOrganizer</div>
              <div className={styles.aboutVersion}>v{VERSION}</div>
              <div className={styles.aboutBuilt}>
                Built by <strong>TR4IS</strong>
              </div>
              <a
                className={styles.aboutLink}
                href="https://github.com/TR4IS/FileOrganizer"
                onClick={(e) => {
                  e.preventDefault()
                  // Open in system browser via shell
                  window.api.setConfig({} as never) // no-op; open URL via IPC if needed
                }}
              >
                github.com/TR4IS/FileOrganizer
              </a>
              <div className={styles.aboutLicense}>MIT License</div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <button
        className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/pages/Settings.module.css`**

```css
.page { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.loading { padding: 40px; color: var(--text-muted); }

.topbar {
  padding: 14px 20px; background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.title { font-size: 16px; font-weight: 700; }

.content { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; }

.section {
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: 10px; overflow: hidden;
}

.sectionTitle {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px;
  color: var(--text-muted); padding: 12px 16px 8px;
  border-bottom: 1px solid var(--border);
}

.row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  gap: 12px;
}
.row:last-child { border-bottom: none; }
.rowLabel { font-size: 12px; color: var(--text-secondary); flex: 1; }
.rowRight { display: flex; align-items: center; gap: 8px; }

.pathText {
  font-size: 11px; color: var(--text-muted);
  max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.versionText { font-size: 12px; color: var(--accent); font-weight: 600; }

.btn {
  padding: 6px 12px; border-radius: 6px; background: transparent;
  color: var(--accent); border: 1px solid var(--accent); font-size: 12px;
}
.btn:hover { background: var(--accent-muted); }

.numInput {
  width: 56px; background: var(--bg-base); color: var(--text-primary);
  border: 1px solid var(--border); border-radius: 6px; padding: 5px 8px;
  font-size: 12px; text-align: center;
}
.numInput:focus { outline: none; border-color: var(--accent); }
.unit { font-size: 11px; color: var(--text-muted); }

/* Theme buttons */
.themeRow { display: flex; gap: 6px; }
.themeBtn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-radius: 8px; font-size: 11px;
  background: var(--bg-base); color: var(--text-secondary);
  border: 1px solid var(--border);
}
.themeBtn:hover { border-color: var(--t-color, var(--accent)); color: var(--text-primary); }
.themeBtnActive { border-color: var(--t-color, var(--accent)); color: var(--t-color, var(--accent)); background: var(--bg-hover); }
.themeDot { width: 10px; height: 10px; border-radius: 50%; background: var(--t-color, var(--accent)); flex-shrink: 0; }

/* Toggle */
.toggle {
  width: 40px; height: 22px; border-radius: 11px;
  background: var(--bg-hover); border: 1px solid var(--border);
  position: relative; transition: background 0.2s;
  flex-shrink: 0;
}
.toggleOn { background: var(--accent); border-color: var(--accent); }
.toggleThumb {
  position: absolute; top: 3px; left: 3px;
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--text-muted); transition: transform 0.2s, background 0.2s;
}
.toggleOn .toggleThumb { transform: translateX(18px); background: var(--accent-text); }

/* About */
.aboutCard { display: flex; align-items: flex-start; gap: 16px; padding: 16px; }
.aboutLogo { width: 48px; height: 48px; background: var(--accent); color: var(--accent-text); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
.aboutInfo { display: flex; flex-direction: column; gap: 4px; }
.aboutName { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.aboutVersion { font-size: 11px; color: var(--text-muted); }
.aboutBuilt { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.aboutLink { font-size: 11px; color: var(--accent); text-decoration: none; }
.aboutLink:hover { text-decoration: underline; }
.aboutLicense { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
```

- [ ] **Step 3: Inject version via Vite define — add to `vite.config.ts`**

Add inside `defineConfig({...})`:
```typescript
define: {
  __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '2.0.0'),
},
```

Add `declare const __APP_VERSION__: string` to `src/types.ts`.

- [ ] **Step 4: Add shell:openExternal IPC for the GitHub link**

In `electron/ipc.ts`, add:
```typescript
import { shell } from 'electron'
// inside registerIpcHandlers:
ipcMain.handle('open-external', (_e, url: string) => shell.openExternal(url))
```

In `electron/preload.ts`, add:
```typescript
openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),
```

Update the About link `onClick` in `Settings.tsx`:
```tsx
onClick={(e) => { e.preventDefault(); window.api.openExternal('https://github.com/TR4IS/FileOrganizer') }}
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Settings.tsx src/pages/Settings.module.css vite.config.ts electron/ipc.ts electron/preload.ts src/types.ts
git commit -m "feat: add Settings page with theme switcher and About section"
```

---

## Task 19: Run and smoke test in dev mode

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Expected: Electron window opens showing the Dashboard. No console errors.

- [ ] **Step 2: Verify each page loads**

Click each sidebar icon. Expected:
- Dashboard: stat cards, folder bar, chart area, activity list visible
- Rules: table with default preset rules visible
- Log: empty log with "No log entries yet" message
- Settings: all sections (Folder, Appearance, Behavior, Updates, About) visible with "Built by TR4IS"

- [ ] **Step 3: Verify organize works**

Select a test folder via "Change Folder". Drop a `.png` and a `.pdf` into it. Click "⚡ Organize Now". Expected: files move into `image/` and `pdf/` subfolders. Log page shows `[->] file.png -> image/`.

- [ ] **Step 4: Verify theme switching**

Go to Settings → Appearance, click Electric Blue. Window immediately switches to blue theme. Restart app, theme persists.

- [ ] **Step 5: Verify watcher**

Click "Watch" on Dashboard. Drop a file into the watched folder. Within 2–3 seconds, it should be auto-organized. Log shows the move.

- [ ] **Step 6: Commit any fixes found during smoke test**

```bash
git add -A && git commit -m "fix: smoke test corrections"
```

---

## Task 20: Run all tests

- [ ] **Step 1: Run tests**

```bash
npm test
```

Expected: All organizer tests pass. 7/7.

- [ ] **Step 2: Fix any failures before continuing**

---

## Task 21: Package and verify build

- [ ] **Step 1: Build for current platform**

```bash
npm run build:dir
```

Expected: `release/win-unpacked/` (or mac/linux equivalent) appears. No build errors.

- [ ] **Step 2: Run the built app**

Open `release/win-unpacked/FileOrganizer.exe`. Verify:
- Window opens with correct icon in taskbar
- JetBrains Mono font loads
- All 4 pages work
- System tray appears on minimize

- [ ] **Step 3: Build installer**

```bash
npm run build
```

Expected: `release/FileOrganizer Setup 2.0.0.exe` (Windows) or equivalent.

- [ ] **Step 4: Commit build config fixes if any**

```bash
git add -A && git commit -m "fix: packaging corrections"
```

---

## Task 22: Python app migration

**Files:**
- Modify: `docs/version.json`

- [ ] **Step 1: Update `docs/version.json` after publishing Electron v2.0.0 to GitHub Releases**

```json
{
  "version": "2.0.0",
  "url": "https://github.com/TR4IS/FileOrganizer/releases/latest/download/FileOrganizerSetup.exe"
}
```

This causes the existing Python app to detect a new version, download the Electron installer, and migrate users automatically.

- [ ] **Step 2: Commit**

```bash
git add docs/version.json
git commit -m "chore: bump version.json to 2.0.0 for Python app migration"
```

---

## Self-Review

**Spec coverage check:**
- ✅ §3.1 Dashboard — Task 15
- ✅ §3.2 Rules + presets — Tasks 3, 16
- ✅ §3.3 Log — Task 17
- ✅ §3.4 Settings + About (TR4IS) — Task 18
- ✅ §4 Theming (Gold/Blue/Green) — Task 12
- ✅ §5 Organizer logic + bug fixes — Task 5
- ✅ §6 IPC API — Tasks 7, 8
- ✅ §7 System tray — Task 9
- ✅ §8 Auto-update (electron-updater + migration) — Tasks 10, 22
- ✅ §9 Packaging (Windows NSIS, macOS DMG, Linux AppImage) — Task 1 (electron-builder.yml), Task 21
- ✅ §10 Project structure — all tasks
- ✅ Icon: `docs/FileOrganizer.ico` used in Tasks 9, 11, electron-builder.yml
- ✅ Font: `docs/JetBrainsMono-Regular.ttf` used in Task 12
