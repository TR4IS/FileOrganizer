import React, { useState, useEffect } from 'react'
import type { Rule } from '../types'
import { PRESET_NAMES } from '../../electron/presets'
import styles from './Rules.module.css'

export default function Rules() {
  const [rules, setRules] = useState<Rule[]>([])
  const [preset, setPreset] = useState('Default')
  const [newExt, setNewExt] = useState('')
  const [newFolder, setNewFolder] = useState('')

  useEffect(() => {
    window.api.getRules().then(setRules)
  }, [])

  async function saveRules(updated: Rule[]) {
    setRules(updated)
    await window.api.setRules(updated)
  }

  async function handleResetPreset() {
    if (!confirm(`Reset to "${preset}" preset? This will replace all current rules.`)) return
    const { PRESETS } = await import('../../electron/presets')
    await saveRules(PRESETS[preset] ?? [])
  }

  async function handleDelete(index: number) {
    await saveRules(rules.filter((_, i) => i !== index))
  }

  async function handleAdd() {
    const ext = newExt.trim().toLowerCase()
    const folder = newFolder.trim().toLowerCase()
    if (!ext || !folder) return
    const normalized = ext.startsWith('.') ? ext : `.${ext}`
    await saveRules([...rules, { extension: normalized, folder }])
    setNewExt('')
    setNewFolder('')
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>Rules</h1>
          <p className={styles.subtitle}>Map file extensions to destination folders</p>
        </div>
        <div className={styles.presetRow}>
          <select
            className={styles.select}
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
          >
            {PRESET_NAMES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button className={styles.btnGhost} onClick={handleResetPreset}>
            Reset to Preset
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Extension</th>
              <th>Destination Folder</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, i) => (
              <tr key={i}>
                <td><code>{rule.extension}</code></td>
                <td>{rule.folder}</td>
                <td>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(i)}>✕</button>
                </td>
              </tr>
            ))}
            <tr className={styles.addRow}>
              <td>
                <input
                  className={styles.input}
                  placeholder=".ext"
                  value={newExt}
                  onChange={(e) => setNewExt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </td>
              <td>
                <input
                  className={styles.input}
                  placeholder="folder-name"
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </td>
              <td>
                <button className={styles.addBtn} onClick={handleAdd}>+ Add</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
