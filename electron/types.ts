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
  lang: 'en' | 'ar'
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
  lastReset?: string                  // ISO date 'YYYY-MM-DD' of last daily reset
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
  lang: 'en',
}
