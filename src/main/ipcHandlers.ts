import { ipcMain, BrowserWindow } from 'electron'
import {
  showOpenPalDialog,
  showOpenImageDialog,
  writePalFile,
  readImageAsDataURL,
  readPalFileByPath,
  getClipboardImageDataURL,
  writeClipboardText,
  showUnsavedChangesDialog,
  showMalformedFileDialog
} from './fileOps'
import { getNote, setNote, getAllNotesForFile } from './notesPersistence'
import {
  getSettings,
  setThemeMode,
  getRecentFiles,
  addRecentFile,
  removeRecentFile
} from './settingsPersistence'
import type { ThemeMode } from './settingsPersistence'

export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  // ── File operations ──────────────────────────────────────────────────────

  ipcMain.handle('pal:open-file', async () => {
    const win = getMainWindow()
    if (!win) return null
    const result = await showOpenPalDialog(win)
    if (!result) return null
    return { path: result.path, data: Array.from(result.data) }
  })

  /** Read a .pal file directly by path (drag-drop, recent files). */
  ipcMain.handle('pal:read-file-by-path', (_event, filePath: string) => {
    const result = readPalFileByPath(filePath)
    if (!result) return null
    return { path: result.path, data: Array.from(result.data) }
  })

  ipcMain.handle('pal:save-file', (_event, filePath: string, data: number[]) => {
    writePalFile(filePath, new Uint8Array(data))
  })

  // ── Image operations ─────────────────────────────────────────────────────

  ipcMain.handle('pal:open-image', async () => {
    const win = getMainWindow()
    if (!win) return null
    const imagePath = await showOpenImageDialog(win)
    if (!imagePath) return null
    try {
      return readImageAsDataURL(imagePath)
    } catch (err) {
      console.error('Failed to read image:', err)
      return null
    }
  })

  /** Read an image file by path (drag-drop). */
  ipcMain.handle('pal:read-image-by-path', (_event, imagePath: string) => {
    try {
      return readImageAsDataURL(imagePath)
    } catch {
      return null
    }
  })

  /** Read the current clipboard image and return a data URL, or null. */
  ipcMain.handle('pal:clipboard-image', () => {
    return getClipboardImageDataURL()
  })

  /** Write plain text to the system clipboard. */
  ipcMain.handle('pal:write-clipboard-text', (_event, text: string) => {
    writeClipboardText(text)
  })

  // ── Notes ────────────────────────────────────────────────────────────────

  ipcMain.handle('pal:get-note', (_event, filePath: string, paletteIndex: number) => {
    return getNote(filePath, paletteIndex)
  })

  ipcMain.handle('pal:set-note', (_event, filePath: string, paletteIndex: number, text: string) => {
    setNote(filePath, paletteIndex, text)
  })

  ipcMain.handle('pal:get-all-notes', (_event, filePath: string) => {
    return getAllNotesForFile(filePath)
  })

  // ── Settings (theme + recent files) ──────────────────────────────────────

  ipcMain.handle('app:get-settings', () => {
    return getSettings()
  })

  ipcMain.handle('app:set-theme', (_event, mode: ThemeMode) => {
    setThemeMode(mode)
  })

  ipcMain.handle('app:get-recent-files', () => {
    return getRecentFiles()
  })

  ipcMain.handle('app:add-recent-file', (_event, filePath: string) => {
    addRecentFile(filePath)
  })

  ipcMain.handle('app:remove-recent-file', (_event, filePath: string) => {
    removeRecentFile(filePath)
  })

  // ── Dialogs ───────────────────────────────────────────────────────────────

  /** Ask the user to confirm discarding unsaved changes. Returns true = proceed. */
  ipcMain.handle('app:confirm-unsaved', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? getMainWindow()
    if (!win) return true
    return showUnsavedChangesDialog(win)
  })

  /**
   * Warn about a malformed .pal file and ask whether to open anyway.
   * Returns true = proceed with partial load.
   */
  ipcMain.handle(
    'app:confirm-malformed-file',
    async (event, fileSize: number, paletteCount: number, trailingBytes: number) => {
      const win = BrowserWindow.fromWebContents(event.sender) ?? getMainWindow()
      if (!win) return false
      return showMalformedFileDialog(win, fileSize, paletteCount, trailingBytes)
    }
  )
}
