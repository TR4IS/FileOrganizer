import React, { useState, useEffect, useRef } from 'react'
import type { RuleSet } from '../types'
import { PRESET_NAMES } from '../../electron/presets'
import { useLang } from '../context/LangContext'
import styles from './Rules.module.css'

type GroupEntry = { extensions: string[]; prefixes: string[]; folderNames: string[] }
type GroupedRules = Map<string, GroupEntry>

function toGrouped(rs: RuleSet): GroupedRules {
  const map: GroupedRules = new Map()
  const get = (folder: string): GroupEntry => {
    if (!map.has(folder)) map.set(folder, { extensions: [], prefixes: [], folderNames: [] })
    return map.get(folder)!
  }
  for (const r of rs.fileRules)   get(r.folder).extensions.push(r.extension)
  for (const r of rs.prefixRules) get(r.folder).prefixes.push(r.prefix)
  for (const r of rs.folderRules) get(r.folder).folderNames.push(r.name)
  return map
}

function fromGrouped(grouped: GroupedRules): RuleSet {
  const fileRules:   RuleSet['fileRules']   = []
  const prefixRules: RuleSet['prefixRules'] = []
  const folderRules: RuleSet['folderRules'] = []
  for (const [folder, { extensions, prefixes, folderNames }] of grouped) {
    for (const extension of extensions) fileRules.push({ extension, folder })
    for (const prefix of prefixes)      prefixRules.push({ prefix, folder })
    for (const name of folderNames)     folderRules.push({ name, folder })
  }
  return { fileRules, prefixRules, folderRules }
}

export default function Rules() {
  const { t } = useLang()
  const [ruleSet, setRuleSet] = useState<RuleSet>({ fileRules: [], prefixRules: [], folderRules: [] })
  const [preset, setPreset] = useState('Default')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState<{ folder: string; type: 'ext' | 'prefix' | 'folderName' } | null>(null)
  const [addValue, setAddValue] = useState('')
  const [addingFolder, setAddingFolder] = useState(false)
  const [newFolderValue, setNewFolderValue] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)
  const newFolderRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.api.getRules().then(setRuleSet)
  }, [])

  useEffect(() => {
    if (adding) setTimeout(() => addInputRef.current?.focus(), 0)
  }, [adding])

  useEffect(() => {
    if (addingFolder) setTimeout(() => newFolderRef.current?.focus(), 0)
  }, [addingFolder])

  async function save(updated: RuleSet) {
    setRuleSet(updated)
    await window.api.setRules(updated)
  }

  async function mutate(fn: (g: GroupedRules) => void) {
    const grouped = toGrouped(ruleSet)
    fn(grouped)
    await save(fromGrouped(grouped))
  }

  function toggleExpanded(folder: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(folder) ? next.delete(folder) : next.add(folder)
      return next
    })
  }

  async function handleDeleteGroup(folder: string) {
    if (!confirm(t.deleteGroupConfirm(folder))) return
    await mutate(g => g.delete(folder))
  }

  async function handleDeleteChip(folder: string, type: 'ext' | 'prefix' | 'folderName', value: string) {
    await mutate(g => {
      const entry = g.get(folder)
      if (!entry) return
      if (type === 'ext')        entry.extensions  = entry.extensions.filter(x => x !== value)
      if (type === 'prefix')     entry.prefixes    = entry.prefixes.filter(x => x !== value)
      if (type === 'folderName') entry.folderNames = entry.folderNames.filter(x => x !== value)
    })
  }

  async function commitAdd() {
    if (!adding || !addValue.trim()) { setAdding(null); setAddValue(''); return }
    const raw = addValue.trim().toLowerCase()
    const val = adding.type === 'ext' && !raw.startsWith('.') ? `.${raw}` : raw
    await mutate(g => {
      const entry = g.get(adding.folder)
      if (!entry) return
      if (adding.type === 'ext'        && !entry.extensions.includes(val))  entry.extensions.push(val)
      if (adding.type === 'prefix'     && !entry.prefixes.includes(val))    entry.prefixes.push(val)
      if (adding.type === 'folderName' && !entry.folderNames.includes(val)) entry.folderNames.push(val)
    })
    setAdding(null)
    setAddValue('')
  }

  async function commitNewFolder() {
    const name = newFolderValue.trim().toLowerCase()
    if (name) {
      await mutate(g => { if (!g.has(name)) g.set(name, { extensions: [], prefixes: [], folderNames: [] }) })
      setExpanded(prev => new Set([...prev, name]))
    }
    setAddingFolder(false)
    setNewFolderValue('')
  }

  async function handleResetPreset() {
    if (!confirm(t.resetConfirm(preset))) return
    const { PRESETS } = await import('../../electron/presets')
    await save(PRESETS[preset] ?? { fileRules: [], prefixRules: [], folderRules: [] })
  }

  const grouped = toGrouped(ruleSet)

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>{t.rulesTitle}</h1>
          <p className={styles.subtitle}>{t.rulesSubtitle}</p>
        </div>
        <div className={styles.presetRow}>
          <select className={styles.select} value={preset} onChange={e => setPreset(e.target.value)}>
            {PRESET_NAMES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className={styles.btnGhost} onClick={handleResetPreset}>{t.resetToPreset}</button>
        </div>
      </div>

      <div className={styles.content}>
        {[...grouped.entries()].map(([folder, entry]) => {
          const isOpen = expanded.has(folder)
          const parts = [
            entry.extensions.length  && `${entry.extensions.length} ext`,
            entry.prefixes.length    && `${entry.prefixes.length} prefix`,
            entry.folderNames.length && `${entry.folderNames.length} folder`,
          ].filter(Boolean)

          return (
            <div key={folder} className={styles.group}>
              <div className={styles.groupHeader} onClick={() => toggleExpanded(folder)}>
                <span className={styles.groupIcon}>📁</span>
                <span className={styles.groupName}>{folder}</span>
                {parts.length > 0 && (
                  <span className={styles.groupCount}>{parts.join(' · ')}</span>
                )}
                <button
                  className={styles.deleteGroupBtn}
                  onClick={e => { e.stopPropagation(); handleDeleteGroup(folder) }}
                >🗑</button>
                <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>▶</span>
              </div>

              {isOpen && (
                <div className={styles.groupBody}>
                  <ChipSection
                    label={t.extensionsSectionLabel}
                    chips={entry.extensions}
                    onDelete={v => handleDeleteChip(folder, 'ext', v)}
                    onAdd={() => setAdding({ folder, type: 'ext' })}
                    addLabel={t.addExtension}
                    isAdding={adding?.folder === folder && adding.type === 'ext'}
                    addValue={addValue}
                    onAddChange={setAddValue}
                    onAddCommit={commitAdd}
                    onAddCancel={() => { setAdding(null); setAddValue('') }}
                    inputRef={addInputRef}
                    placeholder=".ext"
                    chipClass={styles.chipExt}
                  />
                  <hr className={styles.divider} />
                  <ChipSection
                    label={t.prefixesSectionLabel}
                    chips={entry.prefixes}
                    onDelete={v => handleDeleteChip(folder, 'prefix', v)}
                    onAdd={() => setAdding({ folder, type: 'prefix' })}
                    addLabel={t.addPrefix}
                    isAdding={adding?.folder === folder && adding.type === 'prefix'}
                    addValue={addValue}
                    onAddChange={setAddValue}
                    onAddCommit={commitAdd}
                    onAddCancel={() => { setAdding(null); setAddValue('') }}
                    inputRef={addInputRef}
                    placeholder="prefix_"
                    chipClass={styles.chipPrefix}
                  />
                  <hr className={styles.divider} />
                  <ChipSection
                    label={t.folderNamesSectionLabel}
                    chips={entry.folderNames}
                    onDelete={v => handleDeleteChip(folder, 'folderName', v)}
                    onAdd={() => setAdding({ folder, type: 'folderName' })}
                    addLabel={t.addFolderName}
                    isAdding={adding?.folder === folder && adding.type === 'folderName'}
                    addValue={addValue}
                    onAddChange={setAddValue}
                    onAddCommit={commitAdd}
                    onAddCancel={() => { setAdding(null); setAddValue('') }}
                    inputRef={addInputRef}
                    placeholder="folder-name"
                    chipClass={styles.chipFolder}
                  />
                </div>
              )}
            </div>
          )
        })}

        {addingFolder ? (
          <div className={styles.newFolderRow}>
            <input
              ref={newFolderRef}
              className={styles.newFolderInput}
              placeholder={t.newDestFolderPlaceholder}
              value={newFolderValue}
              onChange={e => setNewFolderValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitNewFolder()
                if (e.key === 'Escape') { setAddingFolder(false); setNewFolderValue('') }
              }}
              onBlur={commitNewFolder}
            />
          </div>
        ) : (
          <button className={styles.addFolderBtn} onClick={() => setAddingFolder(true)}>
            {t.newDestFolder}
          </button>
        )}
      </div>
    </div>
  )
}

interface ChipSectionProps {
  label: string
  chips: string[]
  onDelete: (v: string) => void
  onAdd: () => void
  addLabel: string
  isAdding: boolean
  addValue: string
  onAddChange: (v: string) => void
  onAddCommit: () => void
  onAddCancel: () => void
  inputRef: React.RefObject<HTMLInputElement>
  placeholder: string
  chipClass: string
}

function ChipSection({
  label, chips, onDelete, onAdd, addLabel,
  isAdding, addValue, onAddChange, onAddCommit, onAddCancel,
  inputRef, placeholder, chipClass,
}: ChipSectionProps) {
  return (
    <div className={styles.chipSection}>
      <div className={styles.chipLabel}>{label}</div>
      <div className={styles.chips}>
        {chips.map(chip => (
          <span key={chip} className={`${styles.chip} ${chipClass}`}>
            {chip}
            <button className={styles.chipX} onClick={() => onDelete(chip)}>✕</button>
          </span>
        ))}
        {isAdding ? (
          <input
            ref={inputRef}
            className={styles.chipInput}
            placeholder={placeholder}
            value={addValue}
            onChange={e => onAddChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onAddCommit()
              if (e.key === 'Escape') onAddCancel()
            }}
            onBlur={onAddCommit}
          />
        ) : (
          <button className={styles.chipAdd} onClick={onAdd}>{addLabel}</button>
        )}
      </div>
    </div>
  )
}
