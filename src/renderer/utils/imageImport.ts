import type { RGB, SamplingStrategy } from '@core/types'

/**
 * Load a data URL into a canvas, extract ImageData, and run the sampler.
 * Returns a promise that resolves to exactly 32 RGB colors (as dictated
 * by the strategy).
 */
export function sampleImageFromDataURL(
  dataURL: string,
  strategy: SamplingStrategy
): Promise<RGB[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      if (img.width === 0 || img.height === 0) {
        reject(new Error('Image has zero dimensions.'))
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get 2D canvas context.'))
        return
      }

      ctx.drawImage(img, 0, 0)

      let imageData: ImageData
      try {
        imageData = ctx.getImageData(0, 0, img.width, img.height)
      } catch (err) {
        reject(new Error(`Failed to read image pixels: ${String(err)}`))
        return
      }

      try {
        const colors = strategy({
          data: imageData.data,
          width: img.width,
          height: img.height
        })
        resolve(colors)
      } catch (err) {
        reject(err)
      }
    }

    img.onerror = () => reject(new Error('Image failed to load.'))
    img.src = dataURL
  })
}
