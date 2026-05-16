import React from 'react'
import type { ActivityEntry } from '../types'
import styles from './ActivityList.module.css'

const CATEGORY_COLORS: Record<string, string> = {
  image:  '#FFD700',
  video:  '#00AEFF',
  zip:    '#9B59B6',
  exe:    '#E74C3C',
  pdf:    '#2ECC71',
  sound:  '#F39C12',
  gif:    '#1ABC9C',
  font:   '#E67E22',
  os:     '#95A5A6',
  random: '#777777',
}

interface Props {
  entries: ActivityEntry[]
}

export default function ActivityList({ entries }: Props) {
  if (entries.length === 0) {
    return <div className={styles.empty}>No recent activity</div>
  }

  return (
    <ul className={styles.list}>
      {entries.map((entry, i) => {
        const color = CATEGORY_COLORS[entry.folder] ?? '#777'
        return (
          <li key={i} className={styles.item}>
            <div className={styles.name} title={entry.filename}>
              {entry.filename}
            </div>
            <div className={styles.dest} style={{ color }}>
              → {entry.folder}/
            </div>
          </li>
        )
      })}
    </ul>
  )
}
