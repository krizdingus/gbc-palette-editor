import React from 'react'
import { useEditorStore } from '../store/editorStore'

export function PaletteSelector(): React.ReactElement {
  const paletteCount = useEditorStore((s) => s.paletteCount)
  const selectedPaletteIndex = useEditorStore((s) => s.selectedPaletteIndex)
  const selectPalette = useEditorStore((s) => s.selectPalette)
  const dirtyPalettes = useEditorStore((s) => s.dirtyPalettes)
  const filePath = useEditorStore((s) => s.filePath)

  if (!filePath) return <div className="palette-selector palette-selector--empty" />

  return (
    <div className="palette-selector">
      <label className="palette-selector__label" htmlFor="palette-select">Palette</label>
      <select
        id="palette-select"
        className="palette-selector__select"
        value={selectedPaletteIndex}
        onChange={(e) => selectPalette(Number(e.target.value))}
      >
        {Array.from({ length: paletteCount }, (_, i) => (
          <option key={i} value={i}>
            {i}{dirtyPalettes.has(i) ? ' ●' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
