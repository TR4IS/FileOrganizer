export interface RuleSet {
  fileRules:   Array<{ extension: string; folder: string }>
  prefixRules: Array<{ prefix: string;   folder: string }>
  folderRules: Array<{ name: string;     folder: string }>
}

export type Rule = RuleSet['fileRules'][number]

export interface AppConfig {
  targetPath: string
  runInBackground: boolean
  autoStartWatcher: boolean
  debounceSeconds: number
  theme: 'gold' | 'blue' | 'green'
  autoCheckUpdates: boolean
  launchAtStartup: boolean
  lang: 'en' | 'ar'
  moveUnmatchedFolders: boolean
  unmatchedFolderDest: string
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
  byCategory: Record<string, number>
  lastReset?: string
}

export interface ActivityEntry {
  filename: string
  folder: string
  timestamp: number
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
  moveUnmatchedFolders: false,
  unmatchedFolderDest: 'random',
}
