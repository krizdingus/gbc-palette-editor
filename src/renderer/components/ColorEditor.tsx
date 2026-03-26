import React, { useState, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { rgbToHex, hexToRGB } from '@core/color'
import { clamp } from '@core/validation'
import type { RGB } from '@core/types'

export function ColorEditor(): React.ReactElement {
  const workingPalettes = useEditorStore((s) => s.workingPalettes)
  const selectedPaletteIndex = useEditorStore((s) => s.selectedPaletteIndex)
  const selectedSwatchIndex = useEditorStore((s) => s.selectedSwatchIndex)
  const updateColor = useEditorStore((s) => s.updateColor)
  const filePath = useEditorStore((s) => s.filePath)

  const palette = workingPalettes[selectedPaletteIndex]
  const color = palette?.colors[selectedSwatchIndex] ?? null

  // Local hex input state to allow free-form typing
  const [hexInput, setHexInput] = useState('')

  useEffect(() => {
    if (color) setHexInput(rgbToHex(color))
  }, [color, selectedSwatchIndex, selectedPaletteIndex])

  if (!filePath || !color) {
    return <div className="color-editor color-editor--empty" />
  }

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const parsed = hexToRGB(e.target.value)
    if (parsed) {
      updateColor(selectedSwatchIndex, parsed)
      setHexInput(rgbToHex(parsed))
    }
  }

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value
    setHexInput(value)
    const parsed = hexToRGB(value)
    if (parsed) updateColor(selectedSwatchIndex, parsed)
  }

  const handleHexBlur = (): void => {
    if (!hexToRGB(hexInput)) {
      setHexInput(rgbToHex(color))
    }
  }

  const handleChannelChange = (channel: keyof RGB, value: number): void => {
    const clamped = clamp(value, 0, 255)
    const updated: RGB = { ...color, [channel]: clamped }
    updateColor(selectedSwatchIndex, updated)
    setHexInput(rgbToHex(updated))
  }

  return (
    <div className="color-editor">
      <div className="color-editor__header">
        <span className="color-editor__label">
          Color {selectedSwatchIndex}
        </span>
        <div
          className="color-editor__preview"
          style={{ backgroundColor: rgbToHex(color) }}
        />
      </div>

      <div className="color-editor__row">
        <label className="color-editor__field-label" htmlFor="native-picker">Picker</label>
        <input
          id="native-picker"
          type="color"
          value={rgbToHex(color)}
          onChange={handleNativeColorChange}
          className="color-editor__native-picker"
        />
        <label className="color-editor__field-label" htmlFor="hex-input">Hex</label>
        <input
          id="hex-input"
          type="text"
          value={hexInput}
          onChange={handleHexInput}
          onBlur={handleHexBlur}
          className="color-editor__hex-input"
          maxLength={7}
          spellCheck={false}
        />
      </div>

      <div className="color-editor__channels">
        {(['r', 'g', 'b'] as const).map((ch) => (
          <div key={ch} className="color-editor__channel">
            <label className="color-editor__channel-label">{ch.toUpperCase()}</label>
            <input
              type="range"
              min={0}
              max={255}
              value={color[ch]}
              onChange={(e) => handleChannelChange(ch, parseInt(e.target.value, 10))}
              className={`color-editor__slider color-editor__slider--${ch}`}
            />
            <input
              type="number"
              min={0}
              max={255}
              value={color[ch]}
              onChange={(e) => handleChannelChange(ch, parseInt(e.target.value, 10) || 0)}
              className="color-editor__number"
            />
          </div>
        ))}
      </div>

      <div className="color-editor__gbc-note">
        GBC stores 5-bit per channel. Effective: R:{color.r >> 3 << 3} G:{color.g >> 3 << 3} B:{color.b >> 3 << 3}
      </div>
    </div>
  )
}
