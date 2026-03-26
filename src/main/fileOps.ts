import { dialog, clipboard, BrowserWindow } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'

export async function showOpenPalDialog(
  win: BrowserWindow
): Promise<{ path: string; data: Uint8Array } | null> {
  const result = await dialog.showOpenDialog(win, {
    title: 'Open Palette File',
    filters: [{ name: 'GBC Palette Files', extensions: ['pal'] }],
    properties: ['openFile']
  })

  if (result.canceled || !result.filePaths[0]) return null

  const filePath = result.filePaths[0]
  const data = readFileSync(filePath)
  return { path: filePath, data: new Uint8Array(data) }
}

/**
 * Read a .pal file directly by path (used for drag-drop and recent files).
 * Returns null if the file does not exist.
 */
export function readPalFileByPath(
  filePath: string
): { path: string; data: Uint8Array } | null {
  if (!existsSync(filePath)) return null
  const data = readFileSync(filePath)
  return { path: filePath, data: new Uint8Array(data) }
}

export async function showOpenImageDialog(
  win: BrowserWindow
): Promise<string | null> {
  const result = await dialog.showOpenDialog(win, {
    title: 'Import Colors from Image',
    filters: [
      { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] }
    ],
    properties: ['openFile']
  })

  if (result.canceled || !result.filePaths[0]) return null
  return result.filePaths[0]
}

export function writePalFile(filePath: string, data: Uint8Array): void {
  writeFileSync(filePath, Buffer.from(data))
}

/** Read an image file and return it as a base64 data URL for the renderer canvas. */
export function readImageAsDataURL(imagePath: string): string {
  const buf = readFileSync(imagePath)
  const ext = imagePath.split('.').pop()?.toLowerCase() ?? 'png'
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`
  return `data:${mime};base64,${buf.toString('base64')}`
}

/**
 * Write plain text to the system clipboard.
 */
export function writeClipboardText(text: string): void {
  clipboard.writeText(text)
}

/**
 * Read the current clipboard image using Electron's nativeImage API.
 * Returns a base64 data URL (PNG), or null if the clipboard has no image.
 */
export function getClipboardImageDataURL(): string | null {
  const img = clipboard.readImage()
  if (img.isEmpty()) return null
  const dataURL = img.toDataURL()
  // toDataURL returns an empty string for empty images on some platforms
  if (!dataURL || dataURL === 'data:image/png;base64,') return null
  return dataURL
}

/**
 * Show a native "unsaved changes" confirmation dialog.
 * Returns true if the user chose to proceed (discard changes).
 */
export async function showUnsavedChangesDialog(win: BrowserWindow): Promise<boolean> {
  const { response } = await dialog.showMessageBox(win, {
    type: 'question',
    title: 'Unsaved Changes',
    message: 'You have unsaved palette changes.',
    detail: 'Opening a new file will discard your changes. Continue?',
    buttons: ['Open Anyway', 'Cancel'],
    defaultId: 1,
    cancelId: 1
  })
  return response === 0
}

/**
 * Show a native warning dialog for malformed .pal files.
 * Returns true if the user chose to open anyway.
 */
export async function showMalformedFileDialog(
  win: BrowserWindow,
  fileSize: number,
  paletteCount: number,
  trailingBytes: number
): Promise<boolean> {
  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Malformed Palette File',
    message: 'This file has an unexpected size.',
    detail:
      `File size: ${fileSize} bytes (expected a multiple of 64).\n` +
      `${paletteCount} complete palette(s) found. ${trailingBytes} trailing byte(s) will be ignored.\n\n` +
      `Only the ${paletteCount} complete palette(s) will be loaded. The trailing bytes will be preserved in the file if you save.`,
    buttons: ['Open Anyway', 'Cancel'],
    defaultId: 1,
    cancelId: 1
  })
  return response === 0
}
