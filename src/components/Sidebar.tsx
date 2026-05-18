import React from 'react'
import styles from './Sidebar.module.css'

export type Page = 'dashboard' | 'rules' | 'log' | 'settings'

interface Props {
  current: Page
  onChange: (page: Page) => void
}

const ITEMS: { page: Page; label: string; title: string }[] = [
  { page: 'dashboard', label: 'DASH', title: 'Dashboard' },
  { page: 'rules',     label: 'RULES', title: 'Rules' },
  { page: 'log',       label: 'LOG',  title: 'Log' },
]

export default function Sidebar({ current, onChange }: Props) {
  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo} title="FileOrganizer">F</div>
      <div className={styles.items}>
        {ITEMS.map(({ page, label, title }) => (
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
          title="Settings"
        >
          <span className={styles.label}>SET</span>
        </button>
      </div>
    </nav>
  )
}
