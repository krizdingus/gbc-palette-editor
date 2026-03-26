import { describe, it, expect } from 'vitest'
import { createGridSampler, defaultGridSampler } from '@core/sampler'
import { COLORS_PER_PALETTE } from '@core/types'
import type { RawImageData } from '@core/types'

function makeImageData(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number]
): RawImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fill(x, y)
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }
  return { data, width, height }
}

describe('createGridSampler', () => {
  it('throws if cols × rows !== 32', () => {
    expect(() => createGridSampler(3, 8)).toThrow()
    expect(() => createGridSampler(4, 7)).toThrow()
    expect(() => createGridSampler(4, 8)).not.toThrow()
  })
})

describe('defaultGridSampler (4×8)', () => {
  it('returns exactly 32 colors', () => {
    const img = makeImageData(64, 128, () => [128, 64, 32])
    const colors = defaultGridSampler(img)
    expect(colors).toHaveLength(COLORS_PER_PALETTE)
  })

  it('samples correct center-point color from a solid image', () => {
    const img = makeImageData(80, 80, () => [200, 100, 50])
    const colors = defaultGridSampler(img)
    for (const color of colors) {
      expect(color).toEqual({ r: 200, g: 100, b: 50 })
    }
  })

  it('samples distinct colors from quadrant-colored image', () => {
    // 4 columns × 8 rows grid on a 4×8 pixel image
    // Each pixel is uniquely colored by (x + y * 4)
    const width = 4
    const height = 8
    const img = makeImageData(width, height, (x, y) => {
      const index = y * 4 + x
      return [index * 8, index * 4, index * 2]
    })

    const colors = defaultGridSampler(img)
    expect(colors).toHaveLength(32)

    // Each color should correspond to its cell index
    for (let i = 0; i < 32; i++) {
      expect(colors[i]).toEqual({ r: i * 8, g: i * 4, b: i * 2 })
    }
  })

  it('handles a 1×1 image without throwing', () => {
    const img = makeImageData(1, 1, () => [255, 0, 128])
    const colors = defaultGridSampler(img)
    expect(colors).toHaveLength(32)
    for (const c of colors) {
      expect(c).toEqual({ r: 255, g: 0, b: 128 })
    }
  })
})
