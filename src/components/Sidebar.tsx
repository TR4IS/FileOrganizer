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
