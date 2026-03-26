import { contextBridge, ipcRenderer } from 'electron'

/**
 * The API surface exposed to the renderer process via contextBridge.
 * All methods go through IPC; no Node APIs are leaked to the renderer.
 */
const electronAPI = {
  // ── File operations ──────────────────────────────────────────────────────

  /** Open a native file dialog for .pal files. */
  openPalFile: (): Promise<{ path: string; data: number[] } | null> =>
    ipcRenderer.invoke('pal:open-file'),

  /** Read a .pal file directly by path (drag-drop, recent files). */
  readFileByPath: (filePath: string): Promise<{ path: string; data: number[] } | null> =>
    ipcRenderer.invoke('pal:read-file-by-path', filePath),

  /** Write the full file buffer to disk at the given path. */
  savePalFile: (filePath: string, data: number[]): Promise<void> =>
    ipcRenderer.invoke('pal:save-file', filePath, data),

  // ── Image operations ─────────────────────────────────────────────────────

  /** Open a native file dialog for an image and return a base64 data URL. */
  openImageFile: (): Promise<string | null> =>
    ipcRenderer.invoke('pal:open-image'),

  /** Read an image file by path and return a base64 data URL (for drag-drop). */
  readImageByPath: (imagePath: string): Promise<string | null> =>
    ipcRenderer.invoke('pal:read-image-by-path', imagePath),

  /** Read the current clipboard image. Returns a data URL or null. */
  getClipboardImage: (): Promise<string | null> =>
    ipcRenderer.invoke('pal:clipboard-image'),

  /** Write plain text to the system clipboard. */
  writeClipboardText: (text: string): Promise<void> =>
    ipcRenderer.invoke('pal:write-clipboard-text', text),

  // ── Notes ────────────────────────────────────────────────────────────────

  getNote: (filePath: string, paletteIndex: number): Promise<string> =>
    ipcRenderer.invoke('pal:get-note', filePath, paletteIndex),

  setNote: (filePath: string, paletteIndex: number, text: string): Promise<void> =>
    ipcRenderer.invoke('pal:set-note', filePath, paletteIndex, text),

  getAllNotesForFile: (filePath: string): Promise<Record<number, string>> =>
    ipcRenderer.invoke('pal:get-all-notes', filePath),

  // ── Settings ─────────────────────────────────────────────────────────────

  /** Get persisted app settings (theme mode, recent files). */
  getSettings: (): Promise<{ themeMode: 'system' | 'light' | 'dark'; recentFiles: string[] }> =>
    ipcRenderer.invoke('app:get-settings'),

  /** Persist the user's chosen theme mode. */
  setTheme: (mode: 'system' | 'light' | 'dark'): Promise<void> =>
    ipcRenderer.invoke('app:set-theme', mode),

  getRecentFiles: (): Promise<string[]> =>
    ipcRenderer.invoke('app:get-recent-files'),

  addRecentFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('app:add-recent-file', filePath),

  removeRecentFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('app:remove-recent-file', filePath),

  // ── Dialogs ───────────────────────────────────────────────────────────────

  /**
   * Show a native "unsaved changes" confirmation dialog.
   * Returns true if the user chose to proceed (discard changes).
   */
  confirmUnsavedChanges: (): Promise<boolean> =>
    ipcRenderer.invoke('app:confirm-unsaved'),

  /**
   * Show a native warning dialog for a malformed .pal file.
   * Returns true if the user chose to open it anyway.
   */
  confirmMalformedFile: (
    fileSize: number,
    paletteCount: number,
    trailingBytes: number
  ): Promise<boolean> =>
    ipcRenderer.invoke('app:confirm-malformed-file', fileSize, paletteCount, trailingBytes)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
