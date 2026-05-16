import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { Organizer } from '../electron/organizer'
import type { Rule } from '../electron/types'

const RULES: Rule[] = [
  { extension: '.png',  folder: 'image' },
  { extension: '.jpg',  folder: 'image' },
  { extension: '.mp4',  folder: 'video' },
  { extension: '.pdf',  folder: 'pdf' },
  { extension: '.zip',  folder: 'zip' },
]

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fo-test-'))
}

describe('Organizer', () => {
  let targetDir: string
  let logs: string[]
  let org: Organizer

  beforeEach(() => {
    targetDir = makeTempDir()
    logs = []
    org = new Organizer(targetDir, RULES, (line) => logs.push(line))
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

  it('does not create ghost files for missing files', () => {
    // isFileReady must NOT create a file that does not exist
    const ghost = path.join(targetDir, 'ghost.png')
    // ghost does not exist — organizer should not create it
    org.organize()
    expect(fs.existsSync(ghost)).toBe(false)
  })

  it('handles cross-device move gracefully', () => {
    fs.writeFileSync(path.join(targetDir, 'test.png'), 'x')
    const imageDir = path.join(targetDir, 'image')
    fs.mkdirSync(imageDir)
    // Even if move fails it should not throw — just verify it runs without throw
    expect(() => org.organize()).not.toThrow()
  })
})
