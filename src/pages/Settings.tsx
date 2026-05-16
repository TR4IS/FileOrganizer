import React, { useState, useEffect } from 'react'
import type { AppConfig } from '../types'
import styles from './Settings.module.css'

const VERSION = __APP_VERSION__

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
                  window.api.openExternal('https://github.com/TR4IS/FileOrganizer')
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
