'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Download, X, ChevronLeft, ChevronRight, FileText, Trash2 } from 'lucide-react'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

function toDisplayUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `${API_BASE}/media/${path}`
}

function isPdf(url: string) {
  return url.toLowerCase().endsWith('.pdf')
}

function isImage(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(url)
}

interface FilePreviewSheetProps {
  open:         boolean
  onClose:      () => void
  files:        string[]        // relative paths OR full URLs
  initialIndex?: number
  onRemove?:    (url: string) => void  // only in edit context
}

export function FilePreviewSheet({
  open,
  onClose,
  files,
  initialIndex = 0,
  onRemove,
}: FilePreviewSheetProps) {
  const [index, setIndex] = useState(initialIndex)

  const current    = files[index] ?? ''
  const displayUrl = toDisplayUrl(current)
  const total      = files.length

  const prev = () => setIndex((i) => Math.max(0, i - 1))
  const next = () => setIndex((i) => Math.min(total - 1, i + 1))

  const handleDownload = () => window.open(displayUrl, '_blank', 'noopener,noreferrer')

  const handleRemove = () => {
    onRemove?.(current)
    if (index >= total - 1) setIndex(Math.max(0, index - 1))
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-0 pb-0 h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium text-muted-foreground">
            {total > 0 ? `${index + 1} / ${total}` : ''}
          </span>
          <div className="flex items-center gap-2">
            {onRemove && (
              <Button
                variant="ghost" size="sm"
                className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleRemove}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-black/5 dark:bg-black/30 relative">
          {total === 0 ? (
            <p className="text-muted-foreground text-sm">No files</p>
          ) : isPdf(current) ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-6">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <p className="text-sm font-medium text-center break-all">
                {current.split('/').pop()}
              </p>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Open PDF
              </Button>
              {/* iframe for desktop only — iOS Safari doesn't support inline PDF */}
              <iframe
                src={displayUrl}
                className="hidden md:block w-full h-[60vh] rounded-xl border"
                title="PDF Preview"
              />
            </div>
          ) : isImage(current) ? (
            <div className="relative w-full h-full">
              <Image
                src={displayUrl}
                alt={`attachment ${index + 1}`}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 px-6">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <p className="text-sm text-muted-foreground break-all">
                {current.split('/').pop()}
              </p>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          )}

          {total > 1 && (
            <>
              <button
                onClick={prev}
                disabled={index === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 border shadow flex items-center justify-center disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={next}
                disabled={index === total - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 border shadow flex items-center justify-center disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {total > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto shrink-0 bg-background border-t">
            {files.map((f, i) => {
              const url = toDisplayUrl(f)
              return (
                <button
                  key={f}
                  onClick={() => setIndex(i)}
                  className={`w-12 h-12 rounded-lg border-2 shrink-0 overflow-hidden flex items-center justify-center bg-muted transition-all ${
                    i === index ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  {isImage(f) ? (
                    <Image
                      src={url} alt=""
                      width={48} height={48}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
