import { app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export type ThemeMode = 'system' | 'light' | 'dark'

export interface WindowBounds {
  width: number
  height: number
  x?: number
  y?: number
}

// Bump this whenever the default window size changes so stale saved bounds
// from a previous layout don't permanently override the new defaults.
const BOUNDS_VERSION = 7

interface AppSettings {
  themeMode: ThemeMode
  recentFiles: string[]
  windowBounds?: WindowBounds
  boundsVersion?: number
}

const DEFAULTS: AppSettings = {
  themeMode: 'system',
  recentFiles: []
}

const MAX_RECENT = 10

function getSettingsPath(): string {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  return join(dir, 'settings.json')
}

function loadSettings(): AppSettings {
  try {
    const raw = readFileSync(getSettingsPath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      themeMode: parsed.themeMode ?? DEFAULTS.themeMode,
      recentFiles: Array.isArray(parsed.recentFiles) ? parsed.recentFiles : [],
      // Discard saved bounds if they're from a different layout version
      windowBounds: parsed.boundsVersion === BOUNDS_VERSION ? parsed.windowBounds : undefined,
      boundsVersion: parsed.boundsVersion
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function saveSettings(settings: AppSettings): void {
  writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

export function getSettings(): AppSettings {
  return loadSettings()
}

export function setThemeMode(mode: ThemeMode): void {
  const s = loadSettings()
  s.themeMode = mode
  saveSettings(s)
}

export function getRecentFiles(): string[] {
  return loadSettings().recentFiles
}

export function addRecentFile(filePath: string): void {
  const s = loadSettings()
  s.recentFiles = [filePath, ...s.recentFiles.filter((p) => p !== filePath)].slice(0, MAX_RECENT)
  saveSettings(s)
}

export function removeRecentFile(filePath: string): void {
  const s = loadSettings()
  s.recentFiles = s.recentFiles.filter((p) => p !== filePath)
  saveSettings(s)
}

export function getWindowBounds(): WindowBounds | undefined {
  return loadSettings().windowBounds
}

export function setWindowBounds(bounds: WindowBounds): void {
  const s = loadSettings()
  s.windowBounds = bounds
  s.boundsVersion = BOUNDS_VERSION
  saveSettings(s)
}
