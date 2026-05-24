import React, { useState, useEffect, useCallback } from 'react'
import StatCard from '../components/StatCard'
import BarChart from '../components/BarChart'
import ActivityList from '../components/ActivityList'
import { useLang } from '../context/LangContext'
import type { ActivityEntry } from '../types'
import styles from './Dashboard.module.css'

interface DashboardStats {
  today: number
  allTime: number
  byCategory: Record<string, number>
  activity: ActivityEntry[]
}

export default function Dashboard() {
  const { t } = useLang()
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
    const cleanWatcher = window.api.onWatcherStatus((active) => setWatching(active))
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
    if (newPath) setConfig((c) => ({ ...c, targetPath: newPath }))
  }

  const folderName = config.targetPath.split(/[/\\]/).pop() ?? config.targetPath
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const lastRunStr = lastRun
    ? t.lastRun(Math.round((Date.now() - lastRun.getTime()) / 60000))
    : t.notRunYet

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>{t.dashTitle}</h1>
          <p className={styles.subtitle}>{dateStr} · {lastRunStr}</p>
        </div>
        <div className={styles.actions}>
          <div className={`${styles.badge} ${watching ? styles.badgeActive : styles.badgeIdle}`}>
            <span className={watching ? styles.dot : styles.dotIdle} />
            {watching ? t.watchingLabel : t.idle}
          </div>
          <button className={styles.btnGhost} onClick={handleToggleWatcher}>
            {watching ? t.stop : t.watch}
          </button>
          <button className={styles.btnPrimary} onClick={handleOrganize} disabled={busy}>
            {busy ? t.running : t.organizeNow}
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.statRow}>
          <StatCard label={t.filesToday} value={stats.today} sub={t.allTimeCount(stats.allTime.toLocaleString())} accent />
          <div className={styles.watchCard}>
            <div className={styles.cardLabel}>{t.watchingLabel}</div>
            <div className={styles.watchPath}>{folderName || '—'}</div>
            <div className={styles.watchStatus} style={{ color: watching ? 'var(--status-active)' : 'var(--text-muted)' }}>
              {watching ? t.active : t.stoppedStatus}
            </div>
          </div>
          <StatCard label={t.allTime} value={stats.allTime.toLocaleString()} />
        </div>

        <div className={styles.folderBar}>
          <span className={styles.folderIcon}>[dir]</span>
          <span className={styles.folderPath} title={config.targetPath}>
            {config.targetPath || t.noFolderSelected}
          </span>
          <button className={styles.btnGhost} onClick={handleChangeFolder}>{t.changeFolder}</button>
        </div>

        <div className={styles.bottomRow}>
          <div className={styles.chartCard}>
            <div className={styles.cardTitle}>{t.categoryToday}</div>
            <div className={styles.chartArea}>
              <BarChart data={stats.byCategory} noDataLabel={t.noFilesToday} />
            </div>
          </div>
          <div className={styles.activityCard}>
            <div className={styles.cardTitle}>{t.recentActivity}</div>
            <ActivityList entries={stats.activity} noActivityLabel={t.noActivity} />
          </div>
        </div>
      </div>
    </div>
  )
}
