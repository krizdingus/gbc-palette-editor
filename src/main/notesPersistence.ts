import { app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

/** notes.json schema: { [filePath]: { [paletteIndex]: string } } */
type NotesStore = Record<string, Record<string, string>>

function getNotesPath(): string {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  return join(dir, 'notes.json')
}

function loadStore(): NotesStore {
  try {
    const raw = readFileSync(getNotesPath(), 'utf-8')
    return JSON.parse(raw) as NotesStore
  } catch {
    return {}
  }
}

function saveStore(store: NotesStore): void {
  writeFileSync(getNotesPath(), JSON.stringify(store, null, 2), 'utf-8')
}

export function getNote(filePath: string, paletteIndex: number): string {
  const store = loadStore()
  return store[filePath]?.[String(paletteIndex)] ?? ''
}

export function setNote(filePath: string, paletteIndex: number, text: string): void {
  const store = loadStore()
  if (!store[filePath]) store[filePath] = {}
  store[filePath]![String(paletteIndex)] = text
  saveStore(store)
}

export function getAllNotesForFile(filePath: string): Record<number, string> {
  const store = loadStore()
  const fileNotes = store[filePath] ?? {}
  const result: Record<number, string> = {}
  for (const [key, value] of Object.entries(fileNotes)) {
    const index = parseInt(key, 10)
    if (!isNaN(index)) result[index] = value
  }
  return result
}
