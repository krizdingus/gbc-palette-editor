import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  parsePalFile,
  encodePaletteBlock,
  decodePaletteBlock,
  replacePaletteBlock,
  applyAllDirtyPalettes,
  formatPaletteAsDbHex
} from '@core/palette'
import { BYTES_PER_PALETTE, COLORS_PER_PALETTE } from '@core/types'

const FIXTURE_PATH = join(__dirname, '../fixtures/example.pal')

function loadFixture(): Uint8Array {
  return new Uint8Array(readFileSync(FIXTURE_PATH))
}

describe('parsePalFile — example.pal fixture', () => {
  it('parses 4 palettes from the 256-byte fixture', () => {
    const buf = loadFixture()
    expect(buf.length).toBe(256)
    const result = parsePalFile(buf)
    expect(result.paletteCount).toBe(4)
    expect(result.palettes).toHaveLength(4)
  })

  it('each palette contains exactly 32 colors', () => {
    const { palettes } = parsePalFile(loadFixture())
    for (const palette of palettes) {
      expect(palette.colors).toHaveLength(COLORS_PER_PALETTE)
    }
  })

  it('palette 1 and palette 3 are identical', () => {
    // Verified byte-for-byte from the fixture: bytes 0x40-0x7F === bytes 0xC0-0xFF
    const { palettes } = parsePalFile(loadFixture())
    expect(palettes[1]!.colors).toEqual(palettes[3]!.colors)
  })

  it('palette 0 and palette 2 share first 12 colors but differ at colors 12–15', () => {
    // The two palettes share colors 0–11; colors 12–15 differ (verified from xxd)
    const { palettes } = parsePalFile(loadFixture())
    const p0 = palettes[0]!.colors
    const p2 = palettes[2]!.colors

    expect(p0.slice(0, 12)).toEqual(p2.slice(0, 12))
    expect(p0.slice(12, 16)).not.toEqual(p2.slice(12, 16))
  })

  it('palette 0 and palette 1 are different', () => {
    const { palettes } = parsePalFile(loadFixture())
    expect(palettes[0]!.colors).not.toEqual(palettes[1]!.colors)
  })
})

describe('encodePaletteBlock', () => {
  it('produces exactly 64 bytes', () => {
    const { palettes } = parsePalFile(loadFixture())
    const block = encodePaletteBlock(palettes[0]!)
    expect(block).toHaveLength(BYTES_PER_PALETTE)
  })

  it('round-trips: decode → encode produces identical bytes', () => {
    const fixture = loadFixture()
    for (let i = 0; i < 4; i++) {
      const offset = i * BYTES_PER_PALETTE
      const palette = decodePaletteBlock(fixture, offset)
      const reEncoded = encodePaletteBlock(palette)
      const original = fixture.slice(offset, offset + BYTES_PER_PALETTE)
      expect(reEncoded).toEqual(original)
    }
  })
})

describe('replacePaletteBlock', () => {
  it('replaces only the target palette block; all other bytes are identical', () => {
    const fixture = loadFixture()
    const { palettes } = parsePalFile(fixture)

    // Modify palette 1: set all colors to black
    const blackPalette = {
      colors: Array.from({ length: COLORS_PER_PALETTE }, () => ({ r: 0, g: 0, b: 0 }))
    }

    const result = replacePaletteBlock(fixture, 1, blackPalette)

    // Byte length unchanged
    expect(result.length).toBe(fixture.length)

    // Palette 0 untouched
    expect(result.slice(0, 64)).toEqual(fixture.slice(0, 64))

    // Palette 1 changed
    expect(result.slice(64, 128)).not.toEqual(fixture.slice(64, 128))

    // Palette 2 untouched
    expect(result.slice(128, 192)).toEqual(fixture.slice(128, 192))

    // Palette 3 untouched
    expect(result.slice(192, 256)).toEqual(fixture.slice(192, 256))

    // Verify palette 1 is all zeros
    const replaced = decodePaletteBlock(result, 64)
    for (const color of replaced.colors) {
      expect(color).toEqual({ r: 0, g: 0, b: 0 })
    }
  })

  it('does not mutate the original buffer', () => {
    const fixture = loadFixture()
    const original = new Uint8Array(fixture)
    const { palettes } = parsePalFile(fixture)
    const whitePalette = {
      colors: Array.from({ length: COLORS_PER_PALETTE }, () => ({ r: 255, g: 255, b: 255 }))
    }
    replacePaletteBlock(fixture, 0, whitePalette)
    expect(fixture).toEqual(original)
  })
})

describe('formatPaletteAsDbHex', () => {
  it('produces exactly 8 lines', () => {
    const { palettes } = parsePalFile(loadFixture())
    const output = formatPaletteAsDbHex(palettes[0]!)
    expect(output.split('\n')).toHaveLength(8)
  })

  it('each line is exactly 16 uppercase hex characters', () => {
    const { palettes } = parsePalFile(loadFixture())
    const output = formatPaletteAsDbHex(palettes[0]!)
    for (const line of output.split('\n')) {
      expect(line).toHaveLength(16)
      expect(line).toMatch(/^[0-9A-F]{16}$/)
    }
  })

  it('round-trips: output hex encodes the same bytes as encodePaletteBlock', () => {
    const { palettes } = parsePalFile(loadFixture())
    const palette = palettes[0]!
    const output = formatPaletteAsDbHex(palette)
    const allHex = output.split('\n').join('')
    expect(allHex).toHaveLength(128) // 64 bytes × 2 hex chars

    const block = encodePaletteBlock(palette)
    const expectedHex = Array.from(block)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join('')
    expect(allHex).toBe(expectedHex)
  })

  it('all-zero palette produces all-zero hex', () => {
    const zeroPalette = {
      colors: Array.from({ length: COLORS_PER_PALETTE }, () => ({ r: 0, g: 0, b: 0 }))
    }
    const output = formatPaletteAsDbHex(zeroPalette)
    expect(output).toBe(Array(8).fill('0000000000000000').join('\n'))
  })

  it('all-white palette (r:248 g:248 b:248 — max 5-bit) produces expected hex', () => {
    // 5-bit max: r=31 g=31 b=31 → encodes as 0x7FFF LE = 0xFF 0x7F
    const whitePalette = {
      colors: Array.from({ length: COLORS_PER_PALETTE }, () => ({ r: 255, g: 255, b: 255 }))
    }
    const output = formatPaletteAsDbHex(whitePalette)
    // Each color is 2 bytes: FF7F; 4 colors per row = 8 bytes = "FF7FFF7FFF7FFF7F"
    expect(output).toBe(Array(8).fill('FF7FFF7FFF7FFF7F').join('\n'))
  })
})

describe('applyAllDirtyPalettes', () => {
  it('applies only dirty palette changes', () => {
    const fixture = loadFixture()
    const { palettes } = parsePalFile(fixture)

    const whitePalette = {
      colors: Array.from({ length: COLORS_PER_PALETTE }, () => ({ r: 255, g: 255, b: 255 }))
    }

    const working = palettes.map((p) => ({ colors: [...p.colors] }))
    working[2] = whitePalette

    const result = applyAllDirtyPalettes(fixture, working, new Set([2]))

    // Only palette 2 changed
    expect(result.slice(0, 64)).toEqual(fixture.slice(0, 64))
    expect(result.slice(64, 128)).toEqual(fixture.slice(64, 128))
    expect(result.slice(128, 192)).not.toEqual(fixture.slice(128, 192))
    expect(result.slice(192, 256)).toEqual(fixture.slice(192, 256))
  })
})
