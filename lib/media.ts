// @/lib/media.ts
// Media follows the same-origin authenticated proxy, including legacy absolute URLs.
export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) {
    const url = new URL(path)
    return url.pathname.startsWith('/media/') ? `${url.pathname}${url.search}` : path
  }
  const clean = path.replace(/^\/+/, '')
  return clean.startsWith('media/') ? `/${clean}` : `/media/${clean}`
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
