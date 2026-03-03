// @/lib/media.ts

/**
 * Media lives at the Django *origin* — never under /api.
 * NEXT_PUBLIC_API_URL may be "http://localhost:8000/api"
 * We extract only the origin: "http://localhost:8000"
 */
function getOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  try {
    return new URL(raw).origin   // strips /api, trailing slashes, etc.
  } catch {
    return raw.replace(/\/+$/, '')
  }
}

const ORIGIN = getOrigin()

/**
 * Converts a stored relative path → full Django media URL.
 * "uploads/documents/abc.pdf" → "http://localhost:8000/media/uploads/documents/abc.pdf"
 * Already-absolute URLs are returned as-is.
 */
export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const clean = path.startsWith('/') ? path.slice(1) : path
  return `${ORIGIN}/media/${clean}`
}

export function isImagePath(path: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif|heic|svg)$/i.test(path)
}

export function isPdfPath(path: string): boolean {
  return /\.pdf$/i.test(path)
}

export function getFileName(path: string): string {
  return path.split('/').pop() ?? path
}
