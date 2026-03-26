import type { ValidationResult } from './types'
import { BYTES_PER_PALETTE } from './types'

/**
 * Validate a .pal file buffer and return a structured result.
 * Does not throw — callers decide how to surface errors.
 */
export function validatePalBuffer(buffer: Uint8Array): ValidationResult {
  if (buffer.length === 0) {
    return {
      valid: false,
      paletteCount: 0,
      error: 'File is empty.'
    }
  }

  if (buffer.length < BYTES_PER_PALETTE) {
    return {
      valid: false,
      paletteCount: 0,
      error: `File is too small to contain a palette block (${buffer.length} bytes, need at least ${BYTES_PER_PALETTE}).`
    }
  }

  const remainder = buffer.length % BYTES_PER_PALETTE
  const paletteCount = Math.floor(buffer.length / BYTES_PER_PALETTE)

  if (remainder !== 0) {
    return {
      valid: false,
      paletteCount,
      warning: `File size (${buffer.length} bytes) is not a multiple of ${BYTES_PER_PALETTE}. ` +
        `${paletteCount} complete palette(s) found; ${remainder} trailing byte(s) will be ignored.`,
      error: `File size is not a multiple of ${BYTES_PER_PALETTE} bytes.`
    }
  }

  return { valid: true, paletteCount }
}

/** Clamp a number to the range [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
