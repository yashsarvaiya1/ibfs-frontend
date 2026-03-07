// @/lib/media.ts
import { env } from "next-runtime-env"

function getOrigin(): string {
  const raw = env('NEXT_PUBLIC_API_URL') ?? 'http://localhost:8000/api'
  try {
    return new URL(raw).origin
  } catch {
    return raw.replace(/\/+$/, '').replace(/\/api$/, '')
  }
}

export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  
  const origin = getOrigin()
  const clean = path.startsWith('/') ? path.slice(1) : path
  return `${origin}/media/${clean}`
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
