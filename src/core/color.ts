import type { RGB } from './types'

/**
 * Decode a 15-bit GBC color value (little-endian u16) to 8-bit RGB.
 *
 * GBC format: bit 0-4 = red, 5-9 = green, 10-14 = blue (bit 15 unused)
 * Expansion: (channel5 << 3) | (channel5 >> 2)  →  maps 0→0, 31→255
 */
export function decodeGBCColor(value: number): RGB {
  const r5 = value & 0x1f
  const g5 = (value >> 5) & 0x1f
  const b5 = (value >> 10) & 0x1f

  return {
    r: (r5 << 3) | (r5 >> 2),
    g: (g5 << 3) | (g5 >> 2),
    b: (b5 << 3) | (b5 >> 2)
  }
}

/**
 * Encode 8-bit RGB to a 15-bit GBC color value.
 * Truncates low 3 bits of each channel (lossless round-trip at 5-bit precision).
 */
export function encodeGBCColor(color: RGB): number {
  const r5 = (color.r >> 3) & 0x1f
  const g5 = (color.g >> 3) & 0x1f
  const b5 = (color.b >> 3) & 0x1f
  return r5 | (g5 << 5) | (b5 << 10)
}

/**
 * Read a 16-bit little-endian unsigned integer from a byte array at offset.
 */
export function readU16LE(buf: Uint8Array, offset: number): number {
  const lo = buf[offset]
  const hi = buf[offset + 1]
  if (lo === undefined || hi === undefined) {
    throw new RangeError(`readU16LE: offset ${offset} out of bounds (buffer length ${buf.length})`)
  }
  return lo | (hi << 8)
}

/**
 * Write a 16-bit little-endian unsigned integer into a byte array at offset.
 */
export function writeU16LE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff
  buf[offset + 1] = (value >> 8) & 0xff
}

/** Convert an RGB object to a CSS hex string (#rrggbb). */
export function rgbToHex(color: RGB): string {
  return (
    '#' +
    [color.r, color.g, color.b]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  )
}

/** Parse a CSS hex string (#rrggbb or #rgb) to RGB, or return null if invalid. */
export function hexToRGB(hex: string): RGB | null {
  const cleaned = hex.replace(/^#/, '')
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0]! + cleaned[0]!, 16)
    const g = parseInt(cleaned[1]! + cleaned[1]!, 16)
    const b = parseInt(cleaned[2]! + cleaned[2]!, 16)
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null
    return { r, g, b }
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16)
    const g = parseInt(cleaned.slice(2, 4), 16)
    const b = parseInt(cleaned.slice(4, 6), 16)
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null
    return { r, g, b }
  }
  return null
}
