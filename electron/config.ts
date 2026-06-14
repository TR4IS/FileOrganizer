import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { AppConfig, Rule, RuleSet, Stats, ActivityEntry } from './types'
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

const DEFAULT_RULESET: RuleSet = { fileRules: [], prefixRules: [], folderRules: [] }

export function getRules(): RuleSet {
  const raw = readJson<RuleSet | Rule[]>(RULES_PATH, PRESETS.Default)
  // Migration: if stored as plain Rule[], promote to RuleSet
  if (Array.isArray(raw)) {
    return { fileRules: raw, prefixRules: [], folderRules: [] }
  }
  return { ...DEFAULT_RULESET, ...raw }
}

export function setRules(ruleSet: RuleSet): void {
  writeJson(RULES_PATH, ruleSet)
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

export function checkDailyReset(): void {
  const today = new Date().toISOString().slice(0, 10)
  const stats = getStats()
  if (stats.lastReset !== today) {
    writeJson(STATS_PATH, { ...stats, today: 0, byCategory: {}, lastReset: today })
  }
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

let activityLog: ActivityEntry[] = []

export function recordActivity(entry: ActivityEntry): void {
  activityLog.unshift(entry)
  if (activityLog.length > 50) activityLog.pop()
}

export function getActivity(limit = 10): ActivityEntry[] {
  return activityLog.slice(0, limit)
}
