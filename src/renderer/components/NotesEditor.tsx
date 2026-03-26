import React, { useCallback, useRef, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'

const AUTOSAVE_DELAY_MS = 800

export function NotesEditor(): React.ReactElement {
  const filePath = useEditorStore((s) => s.filePath)
  const selectedPaletteIndex = useEditorStore((s) => s.selectedPaletteIndex)
  const notes = useEditorStore((s) => s.notes)
  const updateNote = useEditorStore((s) => s.updateNote)
  const persistNote = useEditorStore((s) => s.persistNote)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentNote = notes[selectedPaletteIndex] ?? ''

  // Cancel any pending debounced save on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value
      updateNote(text)
      const capturedIndex = selectedPaletteIndex
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        persistNote(capturedIndex, text)
      }, AUTOSAVE_DELAY_MS)
    },
    [updateNote, persistNote, selectedPaletteIndex]
  )

  return (
    <div className="notes-editor">
      <label className="notes-editor__label" htmlFor="notes-textarea">
        Notes — Palette {selectedPaletteIndex}
      </label>
      <textarea
        id="notes-textarea"
        className="notes-editor__textarea"
        value={currentNote}
        onChange={handleChange}
        placeholder={filePath ? 'Add notes for this palette…' : 'Open a file to add notes'}
        disabled={!filePath}
        rows={3}
        spellCheck
      />
    </div>
  )
}
