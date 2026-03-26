import { describe, it, expect } from 'vitest'
import { validatePalBuffer } from '@core/validation'
import { BYTES_PER_PALETTE } from '@core/types'

describe('validatePalBuffer', () => {
  it('rejects an empty buffer', () => {
    const result = validatePalBuffer(new Uint8Array(0))
    expect(result.valid).toBe(false)
    expect(result.paletteCount).toBe(0)
    expect(result.error).toBeTruthy()
  })

  it('rejects a buffer smaller than one palette block', () => {
    const result = validatePalBuffer(new Uint8Array(32))
    expect(result.valid).toBe(false)
    expect(result.paletteCount).toBe(0)
    expect(result.error).toBeTruthy()
  })

  it('accepts a buffer that is exactly one palette (64 bytes)', () => {
    const result = validatePalBuffer(new Uint8Array(64))
    expect(result.valid).toBe(true)
    expect(result.paletteCount).toBe(1)
    expect(result.error).toBeUndefined()
    expect(result.warning).toBeUndefined()
  })

  it('accepts the example fixture size (256 bytes = 4 palettes)', () => {
    const result = validatePalBuffer(new Uint8Array(256))
    expect(result.valid).toBe(true)
    expect(result.paletteCount).toBe(4)
  })

  it('rejects a buffer not divisible by 64 — valid=false, paletteCount > 0', () => {
    // 100 bytes = 1 complete palette + 36 trailing bytes
    const result = validatePalBuffer(new Uint8Array(100))
    expect(result.valid).toBe(false)
    expect(result.paletteCount).toBe(1)
    expect(result.warning).toBeTruthy()
    expect(result.error).toBeTruthy()
  })

  it('malformed file: paletteCount reflects only complete palettes', () => {
    // 193 bytes = 3 complete palettes (192) + 1 trailing byte
    const result = validatePalBuffer(new Uint8Array(193))
    expect(result.valid).toBe(false)
    expect(result.paletteCount).toBe(3)
  })

  it('malformed file with exactly one trailing byte has paletteCount > 0', () => {
    const size = BYTES_PER_PALETTE + 1
    const result = validatePalBuffer(new Uint8Array(size))
    expect(result.valid).toBe(false)
    expect(result.paletteCount).toBe(1)
  })

  it('a buffer of exactly N * 64 bytes is always valid', () => {
    for (const n of [1, 2, 4, 8, 16]) {
      const result = validatePalBuffer(new Uint8Array(n * BYTES_PER_PALETTE))
      expect(result.valid).toBe(true)
      expect(result.paletteCount).toBe(n)
    }
  })
})
