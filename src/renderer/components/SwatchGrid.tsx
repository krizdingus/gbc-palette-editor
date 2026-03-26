import React, { useRef } from 'react'
import { useEditorStore } from '../store/editorStore'
import { rgbToHex } from '@core/color'
import { COLORS_PER_PALETTE } from '@core/types'

const COLS = 4
const ROWS = COLORS_PER_PALETTE / COLS // 8

export function SwatchGrid(): React.ReactElement {
  const workingPalettes = useEditorStore((s) => s.workingPalettes)
  const selectedPaletteIndex = useEditorStore((s) => s.selectedPaletteIndex)
  const selectedSwatchIndex = useEditorStore((s) => s.selectedSwatchIndex)
  const selectSwatch = useEditorStore((s) => s.selectSwatch)
  const filePath = useEditorStore((s) => s.filePath)
  const gridRef = useRef<HTMLDivElement>(null)

  const palette = workingPalettes[selectedPaletteIndex]

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    if (!palette) return

    const col = selectedSwatchIndex % COLS
    const row = Math.floor(selectedSwatchIndex / COLS)
    let next = selectedSwatchIndex

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault()
        if (col < COLS - 1) next = selectedSwatchIndex + 1
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (col > 0) next = selectedSwatchIndex - 1
        break
      case 'ArrowDown':
        e.preventDefault()
        if (row < ROWS - 1) next = selectedSwatchIndex + COLS
        break
      case 'ArrowUp':
        e.preventDefault()
        if (row > 0) next = selectedSwatchIndex - COLS
        break
      case 'Home':
        e.preventDefault()
        next = row * COLS // start of current row
        break
      case 'End':
        e.preventDefault()
        next = row * COLS + (COLS - 1) // end of current row
        break
      default:
        return
    }

    if (next !== selectedSwatchIndex) {
      selectSwatch(next)
      // Keep focus on the grid container so arrow keys keep working
      gridRef.current?.focus()
    }
  }

  if (!filePath || !palette) {
    return (
      <div className="swatch-grid swatch-grid--empty">
        <span>Open a .pal file to view colors</span>
      </div>
    )
  }

  return (
    <div
      ref={gridRef}
      className="swatch-grid"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Color palette grid — use arrow keys to navigate"
      role="grid"
    >
      {Array.from({ length: COLORS_PER_PALETTE }, (_, i) => {
        const color = palette.colors[i] ?? { r: 0, g: 0, b: 0 }
        const hex = rgbToHex(color)
        const isSelected = i === selectedSwatchIndex
        const row = Math.floor(i / COLS)
        const col = i % COLS

        return (
          <button
            key={i}
            role="gridcell"
            aria-rowindex={row + 1}
            aria-colindex={col + 1}
            className={`swatch ${isSelected ? 'swatch--selected' : ''}`}
            style={{ backgroundColor: hex }}
            onClick={() => {
              selectSwatch(i)
              gridRef.current?.focus()
            }}
            title={`Color ${i}: ${hex.toUpperCase()} (R:${color.r} G:${color.g} B:${color.b})`}
            aria-label={`Color ${i}: ${hex}`}
            aria-pressed={isSelected}
            tabIndex={-1}
          />
        )
      })}
    </div>
  )
}
