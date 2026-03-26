/** 8-bit per channel RGB color for display and editing */
export interface RGB {
  r: number // 0–255
  g: number // 0–255
  b: number // 0–255
}

/** A single decoded GBC palette block: exactly 32 colors */
export interface Palette {
  colors: readonly RGB[]
}

/** Result of parsing a .pal file */
export interface ParsedFile {
  paletteCount: number
  palettes: readonly Palette[]
}

/** Validation result for a .pal file buffer */
export interface ValidationResult {
  valid: boolean
  paletteCount: number
  warning?: string
  error?: string
}

/** Notes keyed by palette index */
export type PaletteNotes = Record<number, string>

/**
 * The in-memory document model. originalBuffer is kept intact so that
 * save logic can patch only the modified 64-byte slice(s).
 */
export interface EditorDocument {
  filePath: string
  fileName: string
  originalBuffer: Uint8Array
  paletteCount: number
  /** Mutable working copies; index matches palette index */
  workingPalettes: Palette[]
  /** Set of palette indices that differ from the original */
  dirtyPalettes: Set<number>
}

/** Image data passed to the sampler (RGBA flat array, row-major) */
export interface RawImageData {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** A sampling strategy takes raw image data and returns exactly 32 colors */
export type SamplingStrategy = (image: RawImageData) => RGB[]

export const COLORS_PER_PALETTE = 32 as const
export const BYTES_PER_PALETTE = 64 as const
export const BYTES_PER_COLOR = 2 as const
