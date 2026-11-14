// FILE: lib/image.ts

// Shrinks a photo: max 1600px, WebP (JPEG if WebP is not supported). A large photo becomes about 10 times lighter.
export async function compressImage(
  file: File,
  maxSide = 1600,
  quality = 0.8
): Promise<{ blob: Blob; ext: string }> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()

  const toBlob = (type: string) =>
    new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality))

  let blob = await toBlob('image/webp')
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg')
  if (!blob) throw new Error('Could not process image')
  return { blob, ext: blob.type === 'image/webp' ? 'webp' : 'jpg' }
}

// Extracts the storage path from a public URL (used for deleting)
export function storagePath(url: string | null | undefined): string | null {
  if (!url) return null
  const part = url.split('/object/public/posts/')[1]
  return part ? decodeURIComponent(part.split('?')[0]) : null
}
