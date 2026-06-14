import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { Organizer } from '../electron/organizer'
import type { RuleSet } from '../electron/types'

const BASE_RULESET: RuleSet = {
  fileRules: [
    { extension: '.png',  folder: 'image' },
    { extension: '.jpg',  folder: 'image' },
    { extension: '.mp4',  folder: 'video' },
    { extension: '.pdf',  folder: 'pdf' },
    { extension: '.zip',  folder: 'zip' },
  ],
  prefixRules: [],
  folderRules: [],
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fo-test-'))
}

describe('Organizer — file rules (extension matching)', () => {
  let targetDir: string
  let logs: string[]
  let org: Organizer

  beforeEach(() => {
    targetDir = makeTempDir()
    logs = []
    org = new Organizer(targetDir, BASE_RULESET, (line) => logs.push(line))
  })

  afterEach(() => {
    fs.rmSync(targetDir, { recursive: true, force: true })
  })

  it('moves a .png file into image/', () => {
    fs.writeFileSync(path.join(targetDir, 'photo.png'), 'data')
    const result = org.organize()
    expect(result.movedFiles).toBe(1)
    expect(fs.existsSync(path.join(targetDir, 'image', 'photo.png'))).toBe(true)
  })

  it('moves multiple files into correct folders', () => {
    fs.writeFileSync(path.join(targetDir, 'a.png'), 'x')
    fs.writeFileSync(path.join(targetDir, 'b.mp4'), 'x')
    fs.writeFileSync(path.join(targetDir, 'c.pdf'), 'x')
    const result = org.organize()
    expect(result.movedFiles).toBe(3)
    expect(fs.existsSync(path.join(targetDir, 'image', 'a.png'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'video', 'b.mp4'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'pdf',   'c.pdf'))).toBe(true)
  })

  it('moves unknown extension into random/', () => {
    fs.writeFileSync(path.join(targetDir, 'weird.xyz'), 'x')
    const result = org.organize()
    expect(result.movedFiles).toBe(1)
    expect(fs.existsSync(path.join(targetDir, 'random', 'weird.xyz'))).toBe(true)
  })

  it('skips temp extensions', () => {
    fs.writeFileSync(path.join(targetDir, 'downloading.crdownload'), 'x')
    fs.writeFileSync(path.join(targetDir, 'file.part'), 'x')
    const result = org.organize()
    expect(result.movedFiles).toBe(0)
    expect(result.deferredFiles).toBe(0)
  })

  it('skips the category subfolders themselves', () => {
    fs.mkdirSync(path.join(targetDir, 'image'))
    fs.writeFileSync(path.join(targetDir, 'image', 'existing.png'), 'x')
    const result = org.organize()
    expect(result.errors).toBe(0)
    expect(result.movedFiles).toBe(0)
  })

  it('does not create ghost files', () => {
    const ghost = path.join(targetDir, 'ghost.png')
    org.organize()
    expect(fs.existsSync(ghost)).toBe(false)
  })

  it('handles cross-device move gracefully', () => {
    fs.writeFileSync(path.join(targetDir, 'test.png'), 'x')
    expect(() => org.organize()).not.toThrow()
  })
})

describe('Organizer — prefix rules', () => {
  let targetDir: string
  let logs: string[]

  beforeEach(() => {
    targetDir = makeTempDir()
    logs = []
  })

  afterEach(() => {
    fs.rmSync(targetDir, { recursive: true, force: true })
  })

  it('moves a file matching a prefix rule into the mapped folder', () => {
    const ruleSet: RuleSet = {
      fileRules: [],
      prefixRules: [{ prefix: 'screenshot_', folder: 'screenshots' }],
      folderRules: [],
    }
    const org = new Organizer(targetDir, ruleSet, (l) => logs.push(l))
    fs.writeFileSync(path.join(targetDir, 'screenshot_2024.png'), 'x')
    const result = org.organize()
    expect(result.movedFiles).toBe(1)
    expect(fs.existsSync(path.join(targetDir, 'screenshots', 'screenshot_2024.png'))).toBe(true)
  })

  it('extension match takes priority over prefix match', () => {
    const ruleSet: RuleSet = {
      fileRules:   [{ extension: '.png', folder: 'image' }],
      prefixRules: [{ prefix: 'screenshot_', folder: 'screenshots' }],
      folderRules: [],
    }
    const org = new Organizer(targetDir, ruleSet, (l) => logs.push(l))
    fs.writeFileSync(path.join(targetDir, 'screenshot_2024.png'), 'x')
    const result = org.organize()
    expect(result.movedFiles).toBe(1)
    // extension wins: goes to image/, not screenshots/
    expect(fs.existsSync(path.join(targetDir, 'image', 'screenshot_2024.png'))).toBe(true)
  })

  it('files not matching any prefix go to random/', () => {
    const ruleSet: RuleSet = {
      fileRules:   [],
      prefixRules: [{ prefix: 'screenshot_', folder: 'screenshots' }],
      folderRules: [],
    }
    const org = new Organizer(targetDir, ruleSet, (l) => logs.push(l))
    fs.writeFileSync(path.join(targetDir, 'report_q4.pdf'), 'x')
    const result = org.organize()
    expect(result.movedFiles).toBe(1)
    expect(fs.existsSync(path.join(targetDir, 'random', 'report_q4.pdf'))).toBe(true)
  })

  it('single-character prefix works', () => {
    const ruleSet: RuleSet = {
      fileRules:   [],
      prefixRules: [{ prefix: '_', folder: 'misc' }],
      folderRules: [],
    }
    const org = new Organizer(targetDir, ruleSet, (l) => logs.push(l))
    fs.writeFileSync(path.join(targetDir, '_draft.txt'), 'x')
    const result = org.organize()
    expect(result.movedFiles).toBe(1)
    expect(fs.existsSync(path.join(targetDir, 'misc', '_draft.txt'))).toBe(true)
  })
})

describe('Organizer — folder-name rules', () => {
  let targetDir: string
  let logs: string[]

  beforeEach(() => {
    targetDir = makeTempDir()
    logs = []
  })

  afterEach(() => {
    fs.rmSync(targetDir, { recursive: true, force: true })
  })

  it('moves a subfolder matching a folderRule into the mapped destination', () => {
    const ruleSet: RuleSet = {
      fileRules:   [],
      prefixRules: [],
      folderRules: [{ name: 'screenshots', folder: 'image' }],
    }
    const org = new Organizer(targetDir, ruleSet, (l) => logs.push(l))
    fs.mkdirSync(path.join(targetDir, 'screenshots'))
    fs.writeFileSync(path.join(targetDir, 'screenshots', 'pic.png'), 'x')
    const result = org.organize()
    expect(result.movedDirectories).toBe(1)
    expect(fs.existsSync(path.join(targetDir, 'image', 'screenshots', 'pic.png'))).toBe(true)
  })

  it('does not move category folders (protected set)', () => {
    const ruleSet: RuleSet = {
      fileRules:   [{ extension: '.png', folder: 'image' }],
      prefixRules: [],
      folderRules: [],
    }
    const org = new Organizer(targetDir, ruleSet, (l) => logs.push(l))
    fs.mkdirSync(path.join(targetDir, 'image'))
    fs.writeFileSync(path.join(targetDir, 'image', 'existing.png'), 'x')
    const result = org.organize()
    expect(result.movedDirectories).toBe(0)
    expect(fs.existsSync(path.join(targetDir, 'image', 'existing.png'))).toBe(true)
  })

  it('skips unmatched subfolders when moveUnmatchedFolders is false', () => {
    const ruleSet: RuleSet = { fileRules: [], prefixRules: [], folderRules: [] }
    const org = new Organizer(targetDir, ruleSet, (l) => logs.push(l), 720, false, 'random')
    fs.mkdirSync(path.join(targetDir, 'old-project'))
    const result = org.organize()
    expect(result.movedDirectories).toBe(0)
    expect(fs.existsSync(path.join(targetDir, 'old-project'))).toBe(true)
  })

  it('moves unmatched subfolders to unmatchedFolderDest when enabled', () => {
    const ruleSet: RuleSet = { fileRules: [], prefixRules: [], folderRules: [] }
    const org = new Organizer(targetDir, ruleSet, (l) => logs.push(l), 720, true, 'misc')
    fs.mkdirSync(path.join(targetDir, 'old-project'))
    const result = org.organize()
    expect(result.movedDirectories).toBe(1)
    expect(fs.existsSync(path.join(targetDir, 'misc', 'old-project'))).toBe(true)
  })
})
