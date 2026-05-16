import React from 'react'
import styles from './BarChart.module.css'

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
  random: '#555555',
}

interface Props {
  data: Record<string, number>
}

export default function BarChart({ data }: Props) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const max = Math.max(...entries.map(([, v]) => v), 1)

  if (entries.length === 0) {
    return <div className={styles.empty}>No files organized today</div>
  }

  return (
    <div className={styles.chart}>
      {entries.map(([folder, count]) => (
        <div key={folder} className={styles.group}>
          <div
            className={styles.bar}
            style={{
              height: `${(count / max) * 100}%`,
              background: CATEGORY_COLORS[folder] ?? '#555',
            }}
            title={`${folder}: ${count}`}
          />
          <div className={styles.label}>{folder}</div>
        </div>
      ))}
    </div>
  )
}
