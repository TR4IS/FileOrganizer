import React, { useState, useEffect, useRef } from 'react'
import styles from './Log.module.css'

export default function Log() {
  const [lines, setLines] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.api.getLogs().then(setLines)

    const cleanup = window.api.onLog((line) => {
      setLines((prev) => [...prev, line])
    })

    return cleanup
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  async function handleClear() {
    if (!confirm('Clear all log entries?')) return
    await window.api.clearLogs()
    setLines([])
  }

  function lineColor(line: string): string {
    if (line.startsWith('[!]')) return 'var(--color-error, #E74C3C)'
    if (line.startsWith('[+]')) return 'var(--accent)'
    if (line.startsWith('[->]')) return 'var(--text-secondary)'
    if (line.startsWith('[*]')) return 'var(--status-active)'
    return 'var(--text-muted)'
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>Log</h1>
          <p className={styles.subtitle}>{lines.length} entries</p>
        </div>
        <button className={styles.clearBtn} onClick={handleClear}>Clear Log</button>
      </div>
      <div className={styles.logArea}>
        {lines.length === 0 && (
          <div className={styles.empty}>No log entries yet. Run an organize to see activity.</div>
        )}
        {lines.map((line, i) => (
          <div key={i} className={styles.line} style={{ color: lineColor(line) }}>
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
