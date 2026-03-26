import type { Palette, ParsedFile } from './types'
import { BYTES_PER_PALETTE, BYTES_PER_COLOR, COLORS_PER_PALETTE } from './types'
import { decodeGBCColor, encodeGBCColor, readU16LE, writeU16LE } from './color'

/**
 * Parse a raw .pal file buffer into an array of palettes.
 * Assumes the buffer has already been validated (see validation.ts).
 */
export function parsePalFile(buffer: Uint8Array): ParsedFile {
  const paletteCount = Math.floor(buffer.length / BYTES_PER_PALETTE)
  const palettes: Palette[] = []

  for (let p = 0; p < paletteCount; p++) {
    palettes.push(decodePaletteBlock(buffer, p * BYTES_PER_PALETTE))
  }

  return { paletteCount, palettes }
}

/**
 * Decode a single 64-byte palette block starting at `offset` in `buffer`.
 */
export function decodePaletteBlock(buffer: Uint8Array, offset: number): Palette {
  const colors = []
  for (let i = 0; i < COLORS_PER_PALETTE; i++) {
    const value = readU16LE(buffer, offset + i * BYTES_PER_COLOR)
    colors.push(decodeGBCColor(value))
  }
  return { colors }
}

/**
 * Encode a palette into a new 64-byte Uint8Array.
 */
export function encodePaletteBlock(palette: Palette): Uint8Array {
  const block = new Uint8Array(BYTES_PER_PALETTE)
  for (let i = 0; i < COLORS_PER_PALETTE; i++) {
    const color = palette.colors[i]
    if (!color) throw new RangeError(`Palette has fewer than ${COLORS_PER_PALETTE} colors`)
    const value = encodeGBCColor(color)
    writeU16LE(block, i * BYTES_PER_COLOR, value)
  }
  return block
}

/**
 * Return a new buffer that is identical to `originalBuffer` except the
 * palette block at `paletteIndex` has been replaced with the encoded
 * representation of `palette`. All other bytes are byte-identical.
 */
export function replacePaletteBlock(
  originalBuffer: Uint8Array,
  paletteIndex: number,
  palette: Palette
): Uint8Array {
  const result = new Uint8Array(originalBuffer)
  const block = encodePaletteBlock(palette)
  const offset = paletteIndex * BYTES_PER_PALETTE
  result.set(block, offset)
  return result
}

/**
 * Apply all working palettes that are dirty back into the original buffer,
 * returning a new buffer. Bytes at non-dirty positions are byte-identical
 * to the original.
 */
export function applyAllDirtyPalettes(
  originalBuffer: Uint8Array,
  workingPalettes: readonly Palette[],
  dirtyPalettes: ReadonlySet<number>
): Uint8Array {
  let result = new Uint8Array(originalBuffer)
  for (const index of dirtyPalettes) {
    const palette = workingPalettes[index]
    if (!palette) continue
    const block = encodePaletteBlock(palette)
    result.set(block, index * BYTES_PER_PALETTE)
  }
  return result
}

/**
 * Format a palette block as plain uppercase hex for clipboard export.
 * Produces exactly 8 lines of 16 hex characters each (8 bytes per line,
 * covering the full 64-byte palette block). No spaces or separators.
 *
 * Example line: "FF7F9F0ECD000000"
 */
export function formatPaletteAsDbHex(palette: Palette): string {
  return generateHexPreview(palette)
    .map((row) => row.join(''))
    .join('\n')
}

/**
 * Generate the raw hex preview string for a single palette block.
 * Returns an array of formatted byte strings grouped by row (8 bytes per row).
 */
export function generateHexPreview(palette: Palette): string[][] {
  const block = encodePaletteBlock(palette)
  const rows: string[][] = []
  for (let row = 0; row < BYTES_PER_PALETTE / 8; row++) {
    const bytes: string[] = []
    for (let col = 0; col < 8; col++) {
      const byte = block[row * 8 + col]
      bytes.push((byte ?? 0).toString(16).padStart(2, '0').toUpperCase())
    }
    rows.push(bytes)
  }
  return rows
}
