import React from 'react'
import { useLang } from '../context/LangContext'
import styles from './Sidebar.module.css'

export type Page = 'dashboard' | 'rules' | 'log' | 'settings'

interface Props {
  current: Page
  onChange: (page: Page) => void
}

export default function Sidebar({ current, onChange }: Props) {
  const { t } = useLang()

  const items: { page: Page; label: string; title: string }[] = [
    { page: 'dashboard', label: t.navDash,  title: t.dashTitle },
    { page: 'rules',     label: t.navRules, title: t.rulesTitle },
    { page: 'log',       label: t.navLog,   title: t.logTitle },
  ]

  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo} title="FileOrganizer">F</div>
      <div className={styles.items}>
        {items.map(({ page, label, title }) => (
          <button
            key={page}
            className={`${styles.item} ${current === page ? styles.active : ''}`}
            onClick={() => onChange(page)}
            title={title}
          >
            <span className={styles.label}>{label}</span>
          </button>
        ))}
      </div>
      <div className={styles.bottom}>
        <button
          className={`${styles.item} ${current === 'settings' ? styles.active : ''}`}
          onClick={() => onChange('settings')}
          title={t.settingsTitle}
        >
          <span className={styles.label}>{t.navSet}</span>
        </button>
      </div>
    </nav>
  )
}
