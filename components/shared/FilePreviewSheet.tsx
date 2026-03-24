'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Download, X, ChevronLeft, ChevronRight, FileText, Trash2, Loader2 } from 'lucide-react'
import { getMediaUrl, isImagePath, isPdfPath, getFileName } from '@/lib/media'

const PdfViewer = dynamic(
  () => import('@/components/shared/PdfViewer').then(m => m.PdfViewer),
  {
    ssr:     false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

interface FilePreviewSheetProps {
  open:          boolean
  onClose:       () => void
  files:         string[]
  initialIndex?: number
  onRemove?:     (path: string) => void
}

export function FilePreviewSheet({
  open,
  onClose,
  files,
  initialIndex = 0,
  onRemove,
}: FilePreviewSheetProps) {
  const [index, setIndex] = useState(initialIndex)

  // Reset to initialIndex when sheet opens
  useEffect(() => {
    if (open) setIndex(Math.min(initialIndex, Math.max(0, files.length - 1)))
  }, [open, initialIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clamp index when files array shrinks externally (parent removes a file)
  useEffect(() => {
    if (files.length === 0) { onClose(); return }
    setIndex(i => Math.min(i, files.length - 1))
  }, [files.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  setIndex(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIndex(i => Math.min(files.length - 1, i + 1))
      if (e.key === 'Escape')     onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, files.length, onClose])

  const current    = files[index] ?? ''
  const displayUrl = getMediaUrl(current)
  const total      = files.length

  const prev = () => setIndex(i => Math.max(0, i - 1))
  const next = () => setIndex(i => Math.min(total - 1, i + 1))

  // Real browser download via <a download> — works for same-origin media files
  const handleDownload = useCallback(() => {
    if (!current) return
    const a = document.createElement('a')
    a.href     = displayUrl
    a.download = getFileName(current)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [current, displayUrl])

  const handleRemove = () => {
    if (!onRemove) return
    onRemove(current)
    // If last file, close sheet — effect above will also fire but this is instant
    if (total <= 1) { onClose(); return }
    setIndex(i => (i >= total - 1 ? i - 1 : i))
  }

  if (!open) return null

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-0 pb-0 h-[92vh] flex flex-col"
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 border-b">
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="p-1.5 rounded-full hover:bg-muted/60 transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>

          <div className="flex flex-col items-center gap-0.5">
            {total > 0 && (
              <span className="text-xs font-medium text-muted-foreground">
                {index + 1} / {total}
              </span>
            )}
            {current && (
              <span className="text-[10px] text-muted-foreground/60 truncate max-w-40">
                {getFileName(current)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onRemove && (
              <Button
                variant="ghost" size="sm"
                aria-label="Remove file"
                className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleRemove}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost" size="sm"
              aria-label="Download file"
              className="h-8 px-2"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Preview area ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-black/5 dark:bg-black/30 relative min-h-0">
          {total === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">No files</p>
            </div>

          ) : isImagePath(current) ? (
            <div className="relative flex-1">
              <Image
                src={displayUrl}
                alt={`Attachment ${index + 1} — ${getFileName(current)}`}
                fill
                className="object-contain"
                unoptimized
              />
            </div>

          ) : isPdfPath(current) ? (
            <PdfViewer url={displayUrl} className="flex-1 min-h-0" />

          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <p className="text-sm text-muted-foreground break-all text-center">
                {getFileName(current)}
              </p>
              <Button onClick={handleDownload} className="gap-2 rounded-xl">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          )}

          {/* Nav arrows */}
          {total > 1 && (
            <>
              <button
                onClick={prev}
                disabled={index === 0}
                aria-label="Previous file"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/90 border shadow-sm flex items-center justify-center disabled:opacity-30 transition-opacity z-10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={next}
                disabled={index === total - 1}
                aria-label="Next file"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/90 border shadow-sm flex items-center justify-center disabled:opacity-30 transition-opacity z-10"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* ── Thumbnail strip ───────────────────────────────────────── */}
        {total > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto shrink-0 bg-background border-t">
            {files.map((f, i) => (
              <button
                key={f}
                onClick={() => setIndex(i)}
                aria-label={`View file ${i + 1}: ${getFileName(f)}`}
                aria-current={i === index ? 'true' : undefined}
                className={`w-12 h-12 rounded-lg border-2 shrink-0 overflow-hidden flex items-center justify-center bg-muted transition-all ${
                  i === index
                    ? 'border-primary shadow-sm'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {isImagePath(f) ? (
                  <Image
                    src={getMediaUrl(f)}
                    alt=""
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : isPdfPath(f) ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <FileText className="h-4 w-4 text-red-500" />
                    <span className="text-[8px] text-muted-foreground font-bold">PDF</span>
                  </div>
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
