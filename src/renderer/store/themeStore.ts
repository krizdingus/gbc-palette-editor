import { create } from 'zustand'

export type ThemeMode = 'system' | 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => Promise<void>
}

const STORAGE_KEY = 'gbc-theme'

function resolvedTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'dark') return 'dark'
  if (mode === 'light') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(mode: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', resolvedTheme(mode))
}

// Apply before first render to avoid flash of wrong theme
const initialMode = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? 'system'
applyTheme(initialMode)

// Sync system theme changes when mode is 'system'
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const current = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? 'system'
  if (current === 'system') applyTheme('system')
})

export const useThemeStore = create<ThemeState>(() => ({
  mode: initialMode,

  setMode: async (mode: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, mode)
    applyTheme(mode)
    useThemeStore.setState({ mode })
    // Persist to disk via main process (best-effort)
    try {
      await window.electronAPI.setTheme(mode)
    } catch {
      // Non-fatal if IPC fails
    }
  }
}))
