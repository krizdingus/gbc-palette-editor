import { describe, it, expect } from 'vitest'
import { decodeGBCColor, encodeGBCColor, readU16LE, writeU16LE, rgbToHex, hexToRGB } from '@core/color'

describe('decodeGBCColor', () => {
  it('decodes 0x0000 as black', () => {
    expect(decodeGBCColor(0x0000)).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('decodes 0x7FFF as white', () => {
    const { r, g, b } = decodeGBCColor(0x7fff)
    expect(r).toBe(255)
    expect(g).toBe(255)
    expect(b).toBe(255)
  })

  it('decodes full red', () => {
    // R=31, G=0, B=0
    const { r, g, b } = decodeGBCColor(0x001f)
    expect(r).toBe(255)
    expect(g).toBe(0)
    expect(b).toBe(0)
  })

  it('decodes full green', () => {
    // R=0, G=31, B=0
    const { r, g, b } = decodeGBCColor(0x03e0)
    expect(r).toBe(0)
    expect(g).toBe(255)
    expect(b).toBe(0)
  })

  it('decodes full blue', () => {
    // R=0, G=0, B=31
    const { r, g, b } = decodeGBCColor(0x7c00)
    expect(r).toBe(0)
    expect(g).toBe(0)
    expect(b).toBe(255)
  })

  it('uses bit-expansion formula (channel << 3 | channel >> 2)', () => {
    // channel5=1 → (1<<3)|(1>>2) = 8|0 = 8
    const { r } = decodeGBCColor(0x0001)
    expect(r).toBe(8)
  })
})

describe('encodeGBCColor', () => {
  it('encodes black', () => {
    expect(encodeGBCColor({ r: 0, g: 0, b: 0 })).toBe(0x0000)
  })

  it('encodes white', () => {
    expect(encodeGBCColor({ r: 255, g: 255, b: 255 })).toBe(0x7fff)
  })

  it('encodes full red', () => {
    expect(encodeGBCColor({ r: 255, g: 0, b: 0 })).toBe(0x001f)
  })

  it('encodes full green', () => {
    expect(encodeGBCColor({ r: 0, g: 255, b: 0 })).toBe(0x03e0)
  })

  it('encodes full blue', () => {
    expect(encodeGBCColor({ r: 0, g: 0, b: 255 })).toBe(0x7c00)
  })
})

describe('encode/decode round-trip', () => {
  it('decoding then re-encoding produces the same 15-bit value', () => {
    const testValues = [0x0000, 0x7fff, 0x001f, 0x03e0, 0x7c00, 0x1234, 0x5678, 0x7abc]
    for (const value of testValues) {
      const decoded = decodeGBCColor(value)
      const reEncoded = encodeGBCColor(decoded)
      expect(reEncoded).toBe(value)
    }
  })

  it('encoding 8-bit values and decoding back stays within 5-bit precision', () => {
    // After encode→decode, low 3 bits are lost (truncated to 5-bit precision)
    const original = { r: 255, g: 128, b: 64 }
    const encoded = encodeGBCColor(original)
    const decoded = decodeGBCColor(encoded)
    // Re-encode the decoded value; should be identical to first encode
    expect(encodeGBCColor(decoded)).toBe(encoded)
  })
})

describe('readU16LE / writeU16LE', () => {
  it('reads a little-endian u16 correctly', () => {
    const buf = new Uint8Array([0xff, 0x7f])
    expect(readU16LE(buf, 0)).toBe(0x7fff)
  })

  it('round-trips write then read', () => {
    const buf = new Uint8Array(4)
    writeU16LE(buf, 0, 0x1234)
    writeU16LE(buf, 2, 0x5678)
    expect(readU16LE(buf, 0)).toBe(0x1234)
    expect(readU16LE(buf, 2)).toBe(0x5678)
  })

  it('throws on out-of-bounds read', () => {
    const buf = new Uint8Array(1)
    expect(() => readU16LE(buf, 0)).toThrow(RangeError)
  })
})

describe('rgbToHex / hexToRGB', () => {
  it('converts to hex correctly', () => {
    expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000')
    expect(rgbToHex({ r: 0, g: 255, b: 0 })).toBe('#00ff00')
    expect(rgbToHex({ r: 0, g: 0, b: 255 })).toBe('#0000ff')
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000')
  })

  it('parses #rrggbb correctly', () => {
    expect(hexToRGB('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
    expect(hexToRGB('#000000')).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('parses #rgb shorthand', () => {
    expect(hexToRGB('#f00')).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('returns null for invalid hex', () => {
    expect(hexToRGB('not-a-color')).toBeNull()
    expect(hexToRGB('#gg0000')).toBeNull()
  })
})
