# FileOrganizer Electron Rebuild — Design Spec
**Date:** 2026-05-16  
**Author:** TR4IS  
**Status:** Approved

---

## 1. Overview

Rebuild FileOrganizer from Python/CustomTkinter into a cross-platform Electron desktop app (Windows, macOS, Linux) with a modern dashboard-style UI. The core file organization logic is ported to Node.js. The Python app's existing Inno Setup installer serves as the one-time migration vehicle; all subsequent updates use `electron-updater` via GitHub Releases.

**Current app:** Python 3.10+, CustomTkinter, watchdog, pystray  
**New app:** Electron + React + TypeScript + Vite, chokidar, electron-builder  
**Repo:** https://github.com/TR4IS/FileOrganizer  

---

## 2. Architecture

### Process Model

```
┌─────────────────────────────────────────────────┐
│  Main Process (Node.js)                         │
│  ┌──────────┐ ┌──────────┐ ┌─────────────────┐ │
│  │ chokidar │ │organizer │ │  electron-store  │ │
│  │ watcher  │ │ (fs ops) │ │  (config+rules)  │ │
│  └────┬─────┘ └────┬─────┘ └────────┬────────┘ │
│       └────────────┴────────────────┘           │
│                    │ ipcMain                     │
└────────────────────┼────────────────────────────┘
                     │
┌────────────────────┼────────────────────────────┐
│  Preload (contextBridge)                        │
│  window.api = { organize, watch, onLog, ... }   │
└────────────────────┼────────────────────────────┘
                     │
┌────────────────────┼────────────────────────────┐
│  Renderer — React + TypeScript + Vite           │
│  Dashboard | Rules | Log | Settings             │
└─────────────────────────────────────────────────┘
```

- **Main process** owns all file system access (fs, chokidar, path). No direct fs calls in renderer.
- **Preload script** exposes a typed `window.api` bridge via `contextBridge` with `nodeIntegration: false`.
- **Renderer** is pure UI — sends commands, receives events via IPC.

### Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Electron (latest stable) |
| Renderer framework | React 18 + TypeScript |
| Bundler | Vite + vite-plugin-electron |
| Packaging | electron-builder |
| Auto-update | electron-updater |
| File watching | chokidar |
| Config persistence | electron-store |
| Styling | CSS Modules + CSS variables for theming |
| Font | JetBrains Mono (from `docs/JetBrainsMono-Regular.ttf`) |
| Icon | `docs/FileOrganizer.ico` (+ .icns/.png generated for macOS/Linux) |

---

## 3. Screens

### 3.1 Dashboard (default)

- **3 stat cards:** Files Today / Watcher Status + folder name / All-Time Total
- **Bar chart:** category breakdown for today (image, video, zip, exe, pdf, sound, gif, font, other) — colour-coded per category
- **Recent activity list:** last 10 file moves, each showing filename → destination folder with colour tag
- **Top bar:** date + last-run time, watcher status badge (animated dot), Stop/Start toggle button, "⚡ Organize Now" primary button
- **Folder bar:** current target path (truncated), "Change Folder" button

### 3.2 Rules

- **Preset selector dropdown:** Default, Developer, Designer, Media, Minimal
- **Rules table:** columns — Extension | Destination Folder | Delete
- **"Add Rule" button:** inline row append with extension input + folder name input
- **"Reset to Preset" button:** reloads selected preset (with confirmation dialog)
- Saving is automatic (persisted to electron-store on every change)

**Built-in presets:**

| Preset | Description |
|---|---|
| Default | Mirrors Python app: image, video, zip, exe, pdf, sound, gif, font, os, random |
| Developer | Adds: .json→config, .md→docs, .sh/.bat→scripts, .log→logs |
| Designer | Adds: .psd/.ai/.sketch/.fig→design, .svg→vector, .ttf/.otf→fonts |
| Media | Focuses on: image, video, sound, gif — groups everything else as misc |
| Minimal | image and video only — everything else goes to random |

### 3.3 Log

- Scrollable list of all log lines (same format as Python app: `[->] filename → folder/`, `[+] Created folder`, `[!] Error...`)
- "Clear Log" button (with confirmation)
- Auto-scrolls to bottom on new entries
- Log persisted to a `.log` file in the app data directory

### 3.4 Settings

**Sections:**

**Folder**
- Target folder path display + "Change Folder" button (opens native folder picker)

**Appearance**
- Theme switcher: Gold (default) / Electric Blue / Emerald Green
- Theme applied via CSS custom properties, persisted in electron-store

**Behavior**
- Launch at system startup toggle (uses Electron's `app.setLoginItemSettings`)
- Background watcher auto-start on launch toggle
- Watcher debounce delay (seconds) — default 2s

**Updates**
- Current version display
- "Check for Updates" button (triggers electron-updater manual check)
- Auto-check on startup toggle

**About**
- App name: File Organizer
- Version: (dynamic from `package.json`)
- Built by: **TR4IS**
- GitHub link: https://github.com/TR4IS/FileOrganizer
- License: MIT

---

## 4. Theming

Three themes implemented as CSS custom property sets:

```css
/* Gold (default) */
--accent: #FFD700;
--accent-text: #000;
--bg-base: #0f0f0f;
--bg-surface: #161616;
--bg-sidebar: #111;
--border: #1e1e1e;

/* Electric Blue */
--accent: #3B82F6;
--accent-text: #fff;
--bg-base: #0a0d14;
--bg-surface: #0f1520;
--bg-sidebar: #0d1018;
--border: #1a2236;

/* Emerald Green */
--accent: #10B981;
--accent-text: #000;
--bg-base: #090f0d;
--bg-surface: #0d1610;
--bg-sidebar: #0b1209;
--border: #162318;
```

Theme is stored in electron-store and applied on app boot by setting a `data-theme` attribute on `<html>`.

---

## 5. File Organization Logic (Node.js port)

Ported from `fileorganizer/organizer.py` with all known bugs fixed:

**Fixes applied:**
1. `isFileReady()` uses `fs.openSync` with `'r+'` flag (read+write, no create) instead of append mode — no ghost file creation
2. Retry tracker cap: 720 retries × 1s = 12 min max wait, unchanged
3. Extension map built once at startup, O(1) lookup
4. `shutil.move` → `fs.renameSync` with `fs.copyFileSync` + `fs.unlinkSync` fallback (cross-device moves)
5. All errors logged and counted; no silent swallowing

**File categories (default):**
```
image:  .png .jpg .jpeg .psd
video:  .mp4 .mkv .avi .mov .wmv
zip:    .zip .rar
exe:    .exe .msi
pdf:    .pdf
sound:  .mp3 .wav .ogg .flac .m4a
os:     .iso .img
gif:    .gif .webp .apng .avif
font:   .ttf .otf .ttc
random: (catch-all)
```

**Temp extensions skipped:**
`.crdownload .part .part1 .part2 .part3 .tmp .temp .download`

---

## 6. IPC API

Defined in preload via `contextBridge.exposeInMainWorld('api', { ... })`:

```typescript
interface ElectronAPI {
  // Commands (renderer → main)
  organize(): Promise<OrganizeResult>
  setFolder(path: string): Promise<void>
  startWatcher(): Promise<void>
  stopWatcher(): Promise<void>
  getConfig(): Promise<AppConfig>
  setConfig(patch: Partial<AppConfig>): Promise<void>
  getRules(): Promise<Rule[]>
  setRules(rules: Rule[]): Promise<void>
  getStats(): Promise<Stats>
  getLogs(maxLines?: number): Promise<string[]>
  clearLogs(): Promise<void>
  checkForUpdates(): Promise<void>
  selectFolder(): Promise<string | null>

  // Events (main → renderer)
  onLog(cb: (line: string) => void): () => void
  onOrganizeComplete(cb: (result: OrganizeResult) => void): () => void
  onWatcherStatus(cb: (active: boolean) => void): () => void
  onUpdateAvailable(cb: (version: string) => void): () => void
}
```

---

## 7. System Tray

Cross-platform tray using Electron's native `Tray` + `Menu`:

- Icon: `docs/FileOrganizer.ico` (Windows), `.icns` (macOS), `.png` (Linux)
- Menu items: Show Window / Organize Now / Check for Updates / Quit
- On window close: minimize to tray (if background watcher is active), else quit
- Tray tooltip: "FileOrganizer — Watching: [folder name]" or "FileOrganizer — Idle"

---

## 8. Auto-Update Strategy

### Python → Electron (one-time migration)
1. Bump `docs/version.json` to `2.0.0`
2. Set `url` to the new Electron `FileOrganizerSetup.exe` on GitHub Releases
3. Python app detects update, downloads and runs installer
4. Inno Setup installs Electron app (uninstalling Python app first via `[UninstallDelete]`)

### Electron → future versions (electron-updater)
```json
// electron-builder publish config
{
  "publish": {
    "provider": "github",
    "owner": "TR4IS",
    "repo": "FileOrganizer"
  }
}
```
- electron-builder generates `latest.yml` / `latest-mac.yml` / `latest-linux.yml` on each release
- App checks for updates on startup (silent) and via manual "Check for Updates" button
- Update prompt: shows new version number, changelog link, Install button
- On install: downloads in background, relaunches app

---

## 9. Packaging & Distribution

| Platform | Format | Tool |
|---|---|---|
| Windows | NSIS installer (.exe) | electron-builder |
| macOS | DMG + zip | electron-builder |
| Linux | AppImage | electron-builder |

Inno Setup is retired after the migration release. NSIS (built into electron-builder) takes over for Windows.

**App data locations:**
- Windows: `%APPDATA%\FileOrganizer\`
- macOS: `~/Library/Application Support/FileOrganizer/`
- Linux: `~/.config/FileOrganizer/`

---

## 10. Project Structure

```
FileOrganizer/
├── electron/
│   ├── main.ts          # Main process entry
│   ├── preload.ts       # contextBridge API
│   ├── organizer.ts     # File organization logic
│   ├── watcher.ts       # chokidar wrapper
│   ├── config.ts        # electron-store config
│   ├── updater.ts       # electron-updater setup
│   └── tray.ts          # System tray
├── src/
│   ├── App.tsx           # Root, theme provider, router
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Rules.tsx
│   │   ├── Log.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── StatCard.tsx
│   │   ├── BarChart.tsx
│   │   ├── ActivityList.tsx
│   │   └── RulesTable.tsx
│   ├── hooks/
│   │   ├── useOrganizer.ts
│   │   └── useConfig.ts
│   └── styles/
│       ├── themes.css    # CSS custom properties per theme
│       └── global.css
├── docs/
│   ├── FileOrganizer.ico
│   ├── JetBrainsMono-Regular.ttf
│   └── version.json      # Kept for Python app migration only
├── package.json
├── vite.config.ts
└── electron-builder.yml
```

---

## 11. Out of Scope

- Plugin system or extension marketplace
- Cloud sync of organized files
- File preview or thumbnail view
- Undo/redo for file moves
- Multiple watched folders (single folder only, v1)
