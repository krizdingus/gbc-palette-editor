import type { RGB, RawImageData, SamplingStrategy } from './types'
import { COLORS_PER_PALETTE } from './types'

/**
 * Grid-based deterministic sampling strategy.
 *
 * Divides the image into a `cols × rows` grid and samples the center pixel
 * of each cell. Colors are returned in row-major order (left-to-right,
 * top-to-bottom). Total colors = cols * rows, which must equal 32.
 */
export function createGridSampler(cols: number, rows: number): SamplingStrategy {
  if (cols * rows !== COLORS_PER_PALETTE) {
    throw new Error(
      `Grid sampler: cols (${cols}) × rows (${rows}) must equal ${COLORS_PER_PALETTE}`
    )
  }

  return function gridSample(image: RawImageData): RGB[] {
    const { data, width, height } = image
    const colors: RGB[] = []

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Center point of this cell
        const cx = Math.floor((col + 0.5) * (width / cols))
        const cy = Math.floor((row + 0.5) * (height / rows))

        // Clamp to valid pixel bounds
        const px = Math.min(cx, width - 1)
        const py = Math.min(cy, height - 1)

        const idx = (py * width + px) * 4
        colors.push({
          r: data[idx] ?? 0,
          g: data[idx + 1] ?? 0,
          b: data[idx + 2] ?? 0
          // alpha (idx+3) ignored
        })
      }
    }

    return colors
  }
}

/**
 * The default strategy: 4 columns × 8 rows = 32 colors.
 * Matches the layout used by the original PalEditor tool.
 */
export const defaultGridSampler: SamplingStrategy = createGridSampler(4, 8)
