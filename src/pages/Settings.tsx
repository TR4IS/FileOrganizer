import React, { useState, useEffect } from 'react'
import type { AppConfig } from '../types'
import type { UpdateStatus } from '../../electron/preload'
import { useLang } from '../context/LangContext'
import type { Lang } from '../i18n'
import styles from './Settings.module.css'

const VERSION = __APP_VERSION__

interface Props {
  currentTheme: 'gold' | 'blue' | 'green'
  onThemeChange: (t: 'gold' | 'blue' | 'green') => void
}

export default function Settings({ currentTheme, onThemeChange }: Props) {
  const { t, lang, setLang } = useLang()
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)

  useEffect(() => {
    window.api.getConfig().then(setConfig)
    const cleanup = window.api.onUpdateStatus(setUpdateStatus)
    return cleanup
  }, [])

  async function update(patch: Partial<AppConfig>) {
    if (!config) return
    setConfig({ ...config, ...patch })
    await window.api.setConfig(patch)
  }

  async function handleChangeFolder() {
    const p = await window.api.selectFolder()
    if (p && config) setConfig({ ...config, targetPath: p })
  }

  if (!config) return <div className={styles.loading}>{t.settingsTitle}…</div>

  const themes: { id: 'gold' | 'blue' | 'green'; label: string; color: string }[] = [
    { id: 'gold',  label: t.themeGold,  color: '#FFD700' },
    { id: 'blue',  label: t.themeBlue,  color: '#3B82F6' },
    { id: 'green', label: t.themeGreen, color: '#10B981' },
  ]

  const langs: { id: Lang; label: string }[] = [
    { id: 'en', label: t.langEnglish },
    { id: 'ar', label: t.langArabic },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.title}>{t.settingsTitle}</h1>
      </div>

      <div className={styles.content}>

        {/* Language */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.sectionLanguage}</h2>
          <div className={styles.row}>
            <span className={styles.rowLabel}>{t.sectionLanguage}</span>
            <div className={styles.themeRow}>
              {langs.map((l) => (
                <button
                  key={l.id}
                  className={`${styles.themeBtn} ${lang === l.id ? styles.themeBtnActive : ''}`}
                  onClick={() => setLang(l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Folder */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.sectionFolder}</h2>
          <div className={styles.row}>
            <span className={styles.rowLabel}>{t.targetFolder}</span>
            <div className={styles.rowRight}>
              <span className={styles.pathText} title={config.targetPath}>
                {config.targetPath || '—'}
              </span>
              <button className={styles.btn} onClick={handleChangeFolder}>{t.change}</button>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.sectionAppearance}</h2>
          <div className={styles.row}>
            <span className={styles.rowLabel}>{t.theme}</span>
            <div className={styles.themeRow}>
              {themes.map((th) => (
                <button
                  key={th.id}
                  className={`${styles.themeBtn} ${currentTheme === th.id ? styles.themeBtnActive : ''}`}
                  style={{ '--t-color': th.color } as React.CSSProperties}
                  onClick={() => { onThemeChange(th.id); update({ theme: th.id }) }}
                >
                  <span className={styles.themeDot} />
                  {th.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Behavior */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.sectionBehavior}</h2>
          <Toggle label={t.launchAtStartup} value={config.launchAtStartup} onChange={(v) => update({ launchAtStartup: v })} />
          <Toggle label={t.autoStartWatcher} value={config.autoStartWatcher} onChange={(v) => update({ autoStartWatcher: v })} />
          <Toggle
            label={t.moveUnmatchedFolders}
            value={config.moveUnmatchedFolders}
            onChange={(v) => update({ moveUnmatchedFolders: v })}
          />
          {config.moveUnmatchedFolders && (
            <div className={styles.row}>
              <span className={styles.rowLabel}>{t.unmatchedFolderDest}</span>
              <input
                className={styles.textInput}
                value={config.unmatchedFolderDest}
                onChange={(e) => update({ unmatchedFolderDest: e.target.value })}
                onBlur={(e) => {
                  const val = e.target.value.trim()
                  if (!val) update({ unmatchedFolderDest: 'random' })
                }}
              />
            </div>
          )}
          <div className={styles.row}>
            <span className={styles.rowLabel}>{t.watcherDebounce}</span>
            <div className={styles.rowRight}>
              <input
                type="number" min={1} max={30}
                className={styles.numInput}
                value={config.debounceSeconds}
                onChange={(e) => update({ debounceSeconds: Number(e.target.value) })}
              />
              <span className={styles.unit}>{t.seconds}</span>
            </div>
          </div>
        </section>

        {/* Updates */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.sectionUpdates}</h2>
          <Toggle label={t.autoCheckUpdates} value={config.autoCheckUpdates} onChange={(v) => update({ autoCheckUpdates: v })} />
          <div className={styles.row}>
            <span className={styles.rowLabel}>{t.currentVersion}</span>
            <span className={styles.versionText}>v{VERSION}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel} />
            <div className={styles.rowRight}>
              <button
                className={styles.btn}
                disabled={updateStatus?.type === 'downloading'}
                onClick={() => { setUpdateStatus(null); window.api.checkForUpdates() }}
              >
                {updateStatus?.type === 'downloading'
                  ? `${t.checkForUpdates}… ${updateStatus.percent}%`
                  : t.checkForUpdates}
              </button>
              {updateStatus && (
                <span className={styles.updateMsg} data-type={updateStatus.type}>
                  {updateStatus.type === 'available'     && t.updateAvailable(updateStatus.version)}
                  {updateStatus.type === 'not-available' && t.updateNotAvailable}
                  {updateStatus.type === 'downloading'   && t.updateDownloading(updateStatus.percent)}
                  {updateStatus.type === 'downloaded'    && t.updateDownloaded}
                  {updateStatus.type === 'error'         && t.updateError(updateStatus.message)}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* About */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.sectionAbout}</h2>
          <div className={styles.aboutCard}>
            <div className={styles.aboutLogo}>F</div>
            <div className={styles.aboutInfo}>
              <div className={styles.aboutName}>FileOrganizer</div>
              <div className={styles.aboutVersion}>v{VERSION}</div>
              <div className={styles.aboutBuilt}>
                {t.builtBy} <strong>TR4IS</strong>
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
              <div className={styles.aboutLicense}>{t.license}</div>
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
