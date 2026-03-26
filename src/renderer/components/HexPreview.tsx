import React from 'react'
import { useEditorStore } from '../store/editorStore'
import { generateHexPreview } from '@core/palette'
import { BYTES_PER_COLOR } from '@core/types'

export function HexPreview(): React.ReactElement {
  const workingPalettes = useEditorStore((s) => s.workingPalettes)
  const selectedPaletteIndex = useEditorStore((s) => s.selectedPaletteIndex)
  const selectedSwatchIndex = useEditorStore((s) => s.selectedSwatchIndex)
  const filePath = useEditorStore((s) => s.filePath)

  const palette = workingPalettes[selectedPaletteIndex]

  if (!filePath || !palette) {
    return <div className="hex-preview hex-preview--empty" />
  }

  const rows = generateHexPreview(palette)

  return (
    <div className="hex-preview">
      <div className="hex-preview__header">Raw Bytes — Palette {selectedPaletteIndex}</div>
      <div className="hex-preview__grid">
        {rows.map((rowBytes, rowIndex) => {
          // Each row has 8 bytes = 4 colors
          const firstColorInRow = rowIndex * (8 / BYTES_PER_COLOR)

          return (
            <div key={rowIndex} className="hex-preview__row">
              <span className="hex-preview__offset">
                {(rowIndex * 8).toString(16).padStart(2, '0').toUpperCase()}
              </span>
              {rowBytes.map((byte, byteIndex) => {
                const colorIndex = firstColorInRow + Math.floor(byteIndex / BYTES_PER_COLOR)
                const isSelected = colorIndex === selectedSwatchIndex
                return (
                  <span
                    key={byteIndex}
                    className={`hex-preview__byte ${isSelected ? 'hex-preview__byte--selected' : ''}`}
                  >
                    {byte}
                  </span>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
