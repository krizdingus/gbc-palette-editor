import { create } from 'zustand'
import { parsePalFile, applyAllDirtyPalettes, decodePaletteBlock, formatPaletteAsDbHex } from '@core/palette'
import { validatePalBuffer } from '@core/validation'
import { defaultGridSampler } from '@core/sampler'
import { sampleImageFromDataURL } from '../utils/imageImport'
import type { RGB, Palette, PaletteNotes } from '@core/types'
import { BYTES_PER_PALETTE, COLORS_PER_PALETTE } from '@core/types'

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export type StatusType = 'info' | 'warning' | 'error'

/** A snapshot of one palette's colors used for undo/redo. */
interface HistoryEntry {
  paletteIndex: number
  colors: RGB[]
}

const MAX_HISTORY = 50

interface EditorState {
  // Document
  filePath: string | null
  fileName: string | null
  originalBuffer: Uint8Array | null
  paletteCount: number
  workingPalettes: Palette[]
  dirtyPalettes: Set<number>

  // Selection
  selectedPaletteIndex: number
  selectedSwatchIndex: number

  // Notes (palette index → text)
  notes: PaletteNotes

  // Undo/redo
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]
  /** Coalescing key: prevents every slider tick from creating a history entry. */
  lastEditKey: string | null

  // Recent files
  recentFiles: string[]

  // Status
  status: string | null
  statusType: StatusType | null

  // Actions
  openFile: () => Promise<void>
  openFileByPath: (filePath: string) => Promise<void>
  selectPalette: (index: number) => void
  selectSwatch: (index: number) => void
  updateColor: (colorIndex: number, color: RGB) => void
  saveFile: () => Promise<void>
  revertCurrentPalette: () => void
  updateNote: (text: string) => void
  persistNote: (paletteIndex: number, text: string) => Promise<void>
  importFromImage: () => Promise<void>
  importFromClipboard: () => Promise<void>
  importFromImagePath: (imagePath: string) => Promise<void>
  copyDbHex: () => Promise<void>
  undo: () => void
  redo: () => void
  loadRecentFiles: () => Promise<void>
  clearStatus: () => void
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Check unsaved changes and ask the user to confirm before proceeding.
 * Returns true if it's safe to open a new file.
 */
async function confirmIfDirty(dirtyPalettes: Set<number>): Promise<boolean> {
  if (dirtyPalettes.size === 0) return true
  return window.electronAPI.confirmUnsavedChanges()
}

/**
 * Core file-loading logic, shared between openFile and openFileByPath.
 * Takes raw bytes and the resolved path. Handles validation, malformed-file
 * dialog, notes loading, and state update.
 *
 * Behavior for malformed files (size not divisible by 64):
 *   - Shows a native dialog explaining the exact issue
 *   - If user confirms, loads the complete palettes and ignores trailing bytes
 *   - If user cancels, aborts loading entirely
 *   - Empty/too-small files are always rejected with a status error (no dialog)
 */
async function loadFileIntoState(
  set: (partial: Partial<EditorState>) => void,
  get: () => EditorState,
  result: { path: string; data: number[] }
): Promise<void> {
  const buffer = new Uint8Array(result.data)
  const validation = validatePalBuffer(buffer)

  // Hard reject: no complete palettes exist at all
  if (validation.paletteCount === 0) {
    set({ status: validation.error ?? 'Invalid file.', statusType: 'error' })
    return
  }

  // Malformed but has some valid palettes: ask the user explicitly
  if (!validation.valid) {
    const trailingBytes = buffer.length % BYTES_PER_PALETTE
    const proceed = await window.electronAPI.confirmMalformedFile(
      buffer.length,
      validation.paletteCount,
      trailingBytes
    )
    if (!proceed) return
  }

  const { palettes, paletteCount } = parsePalFile(buffer)

  let notes: PaletteNotes = {}
  try {
    notes = await window.electronAPI.getAllNotesForFile(result.path)
  } catch {
    // Notes failure is non-fatal
  }

  // Persist to recent files (best-effort)
  try {
    await window.electronAPI.addRecentFile(result.path)
    const updated = await window.electronAPI.getRecentFiles()
    set({ recentFiles: updated })
  } catch {
    // Non-fatal
  }

  const fileName = result.path.split(/[\\/]/).pop() ?? result.path

  set({
    filePath: result.path,
    fileName,
    originalBuffer: buffer,
    paletteCount,
    workingPalettes: palettes.map((p) => ({ colors: [...p.colors] })),
    dirtyPalettes: new Set(),
    selectedPaletteIndex: 0,
    selectedSwatchIndex: 0,
    notes,
    undoStack: [],
    redoStack: [],
    lastEditKey: null,
    status: !validation.valid
      ? `Loaded ${paletteCount} palette(s). Trailing bytes ignored.`
      : `Opened "${fileName}" — ${paletteCount} palette(s)`,
    statusType: !validation.valid ? 'warning' : 'info'
  })
}

/**
 * Core image-sampling logic, shared by all three import paths
 * (file dialog, clipboard, drag-drop).
 */
async function importColorsFromDataURL(
  set: (partial: Partial<EditorState>) => void,
  get: () => EditorState,
  dataURL: string
): Promise<void> {
  const { workingPalettes, selectedPaletteIndex, dirtyPalettes, undoStack } = get()

  const colors = await sampleImageFromDataURL(dataURL, defaultGridSampler)

  const palette = workingPalettes[selectedPaletteIndex]
  const newUndoStack = palette
    ? [...undoStack, { paletteIndex: selectedPaletteIndex, colors: [...palette.colors] }].slice(-MAX_HISTORY)
    : undoStack

  const newPalettes = [...workingPalettes]
  newPalettes[selectedPaletteIndex] = { colors }

  const newDirty = new Set(dirtyPalettes)
  newDirty.add(selectedPaletteIndex)

  set({
    workingPalettes: newPalettes,
    dirtyPalettes: newDirty,
    selectedSwatchIndex: 0,
    undoStack: newUndoStack,
    redoStack: [],
    lastEditKey: null,
    status: 'Imported 32 colors from image.',
    statusType: 'info'
  })
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useEditorStore = create<EditorState>((set, get) => ({
  filePath: null,
  fileName: null,
  originalBuffer: null,
  paletteCount: 0,
  workingPalettes: [],
  dirtyPalettes: new Set(),
  selectedPaletteIndex: 0,
  selectedSwatchIndex: 0,
  notes: {},
  undoStack: [],
  redoStack: [],
  lastEditKey: null,
  recentFiles: [],
  status: null,
  statusType: null,

  // -------------------------------------------------------------------------
  openFile: async () => {
    const { dirtyPalettes } = get()
    if (!(await confirmIfDirty(dirtyPalettes))) return

    const result = await window.electronAPI.openPalFile()
    if (!result) return

    await loadFileIntoState(set, get, result)
  },

  // -------------------------------------------------------------------------
  /** Open a file directly by path — used for drag-drop and recent files. */
  openFileByPath: async (filePath) => {
    const { dirtyPalettes } = get()
    if (!(await confirmIfDirty(dirtyPalettes))) return

    let result: { path: string; data: number[] } | null
    try {
      result = await window.electronAPI.readFileByPath(filePath)
    } catch (err) {
      set({ status: `Could not read file: ${String(err)}`, statusType: 'error' })
      return
    }

    if (!result) {
      const name = filePath.split(/[\\/]/).pop() ?? filePath
      set({ status: `File not found: "${name}"`, statusType: 'error' })
      // Remove the dead entry from recent files (best-effort)
      try {
        await window.electronAPI.removeRecentFile(filePath)
        const updated = await window.electronAPI.getRecentFiles()
        set({ recentFiles: updated })
      } catch {
        // Non-fatal
      }
      return
    }

    await loadFileIntoState(set, get, result)
  },

  // -------------------------------------------------------------------------
  selectPalette: (index) => {
    const { paletteCount } = get()
    if (index < 0 || index >= paletteCount) return
    set({ selectedPaletteIndex: index, selectedSwatchIndex: 0, lastEditKey: null })
  },

  // -------------------------------------------------------------------------
  selectSwatch: (index) => {
    if (index < 0 || index >= COLORS_PER_PALETTE) return
    set({ selectedSwatchIndex: index })
  },

  // -------------------------------------------------------------------------
  updateColor: (colorIndex, color) => {
    const { workingPalettes, selectedPaletteIndex, originalBuffer, dirtyPalettes, undoStack, lastEditKey } = get()
    if (!originalBuffer) return

    const palette = workingPalettes[selectedPaletteIndex]
    if (!palette) return

    // Push a history snapshot when starting a new edit (different color or palette).
    // Coalesce consecutive edits to the same color so dragging a slider is one undo step.
    const editKey = `${selectedPaletteIndex}:${colorIndex}`
    const newUndoStack = editKey !== lastEditKey
      ? [...undoStack, { paletteIndex: selectedPaletteIndex, colors: [...palette.colors] }].slice(-MAX_HISTORY)
      : undoStack

    const newColors = [...palette.colors]
    newColors[colorIndex] = color

    const newPalettes = [...workingPalettes]
    newPalettes[selectedPaletteIndex] = { colors: newColors }

    const newDirty = new Set(dirtyPalettes)
    newDirty.add(selectedPaletteIndex)

    set({
      workingPalettes: newPalettes,
      dirtyPalettes: newDirty,
      undoStack: newUndoStack,
      redoStack: [],
      lastEditKey: editKey
    })
  },

  // -------------------------------------------------------------------------
  saveFile: async () => {
    const { filePath, originalBuffer, workingPalettes, dirtyPalettes } = get()
    if (!filePath || !originalBuffer) {
      set({ status: 'No file is open.', statusType: 'error' })
      return
    }
    if (dirtyPalettes.size === 0) {
      set({ status: 'No changes to save.', statusType: 'info' })
      return
    }

    const finalBuffer = applyAllDirtyPalettes(originalBuffer, workingPalettes, dirtyPalettes)

    try {
      await window.electronAPI.savePalFile(filePath, Array.from(finalBuffer))
      set({
        originalBuffer: finalBuffer,
        dirtyPalettes: new Set(),
        status: 'Saved.',
        statusType: 'info'
      })
    } catch (err) {
      set({ status: `Save failed: ${String(err)}`, statusType: 'error' })
    }
  },

  // -------------------------------------------------------------------------
  revertCurrentPalette: () => {
    const { originalBuffer, selectedPaletteIndex, workingPalettes, dirtyPalettes, undoStack } = get()
    if (!originalBuffer) return

    const palette = workingPalettes[selectedPaletteIndex]
    const newUndoStack = palette
      ? [...undoStack, { paletteIndex: selectedPaletteIndex, colors: [...palette.colors] }].slice(-MAX_HISTORY)
      : undoStack

    const offset = selectedPaletteIndex * BYTES_PER_PALETTE
    const original = decodePaletteBlock(originalBuffer, offset)

    const newPalettes = [...workingPalettes]
    newPalettes[selectedPaletteIndex] = { colors: [...original.colors] }

    const newDirty = new Set(dirtyPalettes)
    newDirty.delete(selectedPaletteIndex)

    set({
      workingPalettes: newPalettes,
      dirtyPalettes: newDirty,
      undoStack: newUndoStack,
      redoStack: [],
      lastEditKey: null,
      status: `Reverted palette ${selectedPaletteIndex}.`,
      statusType: 'info'
    })
  },

  // -------------------------------------------------------------------------
  /** Update the note in local state only. Debounced persistence is in NotesEditor. */
  updateNote: (text) => {
    const { selectedPaletteIndex, notes } = get()
    set({ notes: { ...notes, [selectedPaletteIndex]: text } })
  },

  /**
   * Persist a note to disk. Takes an explicit paletteIndex so the debounce
   * callback always targets the palette that was active when typing started,
   * not whatever is selected when the timer fires.
   */
  persistNote: async (paletteIndex: number, text: string) => {
    const { filePath } = get()
    if (!filePath) return
    try {
      await window.electronAPI.setNote(filePath, paletteIndex, text)
    } catch {
      // Non-fatal; don't surface to status bar on every keystroke
    }
  },

  // -------------------------------------------------------------------------
  importFromImage: async () => {
    const { originalBuffer } = get()
    if (!originalBuffer) {
      set({ status: 'Open a .pal file before importing.', statusType: 'error' })
      return
    }

    const dataURL = await window.electronAPI.openImageFile()
    if (!dataURL) return

    try {
      await importColorsFromDataURL(set, get, dataURL)
    } catch (err) {
      set({ status: `Image import failed: ${String(err)}`, statusType: 'error' })
    }
  },

  // -------------------------------------------------------------------------
  /** Import colors from the system clipboard image. */
  importFromClipboard: async () => {
    const { originalBuffer } = get()
    if (!originalBuffer) {
      set({ status: 'Open a .pal file before importing.', statusType: 'error' })
      return
    }

    const dataURL = await window.electronAPI.getClipboardImage()
    if (!dataURL) {
      set({ status: 'No image found in clipboard.', statusType: 'warning' })
      return
    }

    try {
      await importColorsFromDataURL(set, get, dataURL)
    } catch (err) {
      set({ status: `Clipboard import failed: ${String(err)}`, statusType: 'error' })
    }
  },

  // -------------------------------------------------------------------------
  /** Import colors from an image at a known path (drag-drop). */
  importFromImagePath: async (imagePath: string) => {
    const { originalBuffer } = get()
    if (!originalBuffer) {
      set({ status: 'Open a .pal file before importing.', statusType: 'error' })
      return
    }

    const dataURL = await window.electronAPI.readImageByPath(imagePath)
    if (!dataURL) {
      set({ status: `Could not read image: ${imagePath}`, statusType: 'error' })
      return
    }

    try {
      await importColorsFromDataURL(set, get, dataURL)
    } catch (err) {
      set({ status: `Image import failed: ${String(err)}`, statusType: 'error' })
    }
  },

  // -------------------------------------------------------------------------
  undo: () => {
    const { undoStack, redoStack, workingPalettes, dirtyPalettes, originalBuffer } = get()
    if (undoStack.length === 0) return

    const entry = undoStack[undoStack.length - 1]!
    const currentPalette = workingPalettes[entry.paletteIndex]
    if (!currentPalette) return

    // Push current state to redo stack
    const newRedoStack = [...redoStack, { paletteIndex: entry.paletteIndex, colors: [...currentPalette.colors] }]

    const newPalettes = [...workingPalettes]
    newPalettes[entry.paletteIndex] = { colors: entry.colors }

    // Recompute dirty: palette is dirty if it now differs from original
    const newDirty = new Set(dirtyPalettes)
    if (originalBuffer) {
      const offset = entry.paletteIndex * BYTES_PER_PALETTE
      const orig = decodePaletteBlock(originalBuffer, offset)
      const isDirty = entry.colors.some(
        (c, i) => c.r !== orig.colors[i]!.r || c.g !== orig.colors[i]!.g || c.b !== orig.colors[i]!.b
      )
      if (isDirty) newDirty.add(entry.paletteIndex)
      else newDirty.delete(entry.paletteIndex)
    }

    set({
      workingPalettes: newPalettes,
      dirtyPalettes: newDirty,
      undoStack: undoStack.slice(0, -1),
      redoStack: newRedoStack,
      selectedPaletteIndex: entry.paletteIndex,
      selectedSwatchIndex: 0,
      lastEditKey: null
    })
  },

  // -------------------------------------------------------------------------
  redo: () => {
    const { redoStack, undoStack, workingPalettes, dirtyPalettes, originalBuffer } = get()
    if (redoStack.length === 0) return

    const entry = redoStack[redoStack.length - 1]!
    const currentPalette = workingPalettes[entry.paletteIndex]
    if (!currentPalette) return

    // Push current state to undo stack
    const newUndoStack = [...undoStack, { paletteIndex: entry.paletteIndex, colors: [...currentPalette.colors] }]

    const newPalettes = [...workingPalettes]
    newPalettes[entry.paletteIndex] = { colors: entry.colors }

    const newDirty = new Set(dirtyPalettes)
    if (originalBuffer) {
      const offset = entry.paletteIndex * BYTES_PER_PALETTE
      const orig = decodePaletteBlock(originalBuffer, offset)
      const isDirty = entry.colors.some(
        (c, i) => c.r !== orig.colors[i]!.r || c.g !== orig.colors[i]!.g || c.b !== orig.colors[i]!.b
      )
      if (isDirty) newDirty.add(entry.paletteIndex)
      else newDirty.delete(entry.paletteIndex)
    }

    set({
      workingPalettes: newPalettes,
      dirtyPalettes: newDirty,
      undoStack: newUndoStack,
      redoStack: redoStack.slice(0, -1),
      selectedPaletteIndex: entry.paletteIndex,
      selectedSwatchIndex: 0,
      lastEditKey: null
    })
  },

  // -------------------------------------------------------------------------
  /** Copy the current selected palette block to the clipboard as db-style hex. */
  copyDbHex: async () => {
    const { originalBuffer, workingPalettes, selectedPaletteIndex } = get()
    if (!originalBuffer) {
      set({ status: 'Open a .pal file first.', statusType: 'error' })
      return
    }
    const palette = workingPalettes[selectedPaletteIndex]
    if (!palette) {
      set({ status: 'No palette selected.', statusType: 'error' })
      return
    }
    const text = formatPaletteAsDbHex(palette)
    try {
      await window.electronAPI.writeClipboardText(text)
      set({ status: `Copied palette ${selectedPaletteIndex} to clipboard.`, statusType: 'info' })
    } catch (err) {
      set({ status: `Copy failed: ${String(err)}`, statusType: 'error' })
    }
  },

  // -------------------------------------------------------------------------
  loadRecentFiles: async () => {
    try {
      const files = await window.electronAPI.getRecentFiles()
      set({ recentFiles: files })
    } catch {
      // Non-fatal
    }
  },

  // -------------------------------------------------------------------------
  clearStatus: () => set({ status: null, statusType: null })
}))
