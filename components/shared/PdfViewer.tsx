'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { ChevronLeft, ChevronRight, Loader2, FileWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/axios'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface PdfViewerProps {
  url: string
  className?: string
}

export function PdfViewer({ url, className }: PdfViewerProps) {
  const [numPages,   setNumPages]   = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [blobUrl,    setBlobUrl]    = useState<string | null>(null)

  // ✅ Measure the scroll container width so Page fills it exactly
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageWidth,  setPageWidth]  = useState<number>(0)

  // ✅ ResizeObserver — re-measures on every layout change (orientation, keyboard, etc.)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width
        if (w > 0) setPageWidth(w)
      }
    })
    ro.observe(el)
    // Initial measure
    setPageWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // ── Authenticated PDF fetch ────────────────────────────────────────────
  useEffect(() => {
    let activeBlobUrl: string | null = null

    async function loadPdf() {
      try {
        setLoading(true)
        setError(null)
        const response = await api.get(url, { responseType: 'blob' })
        const blob = new Blob([response.data], { type: 'application/pdf' })
        activeBlobUrl = URL.createObjectURL(blob)
        setBlobUrl(activeBlobUrl)
      } catch (err: any) {
        console.error('PDF Load Error:', err)
        setError(
          err.response?.status === 401
            ? 'Session expired. Please log in again.'
            : 'Could not load document preview.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadPdf()
    return () => { if (activeBlobUrl) URL.revokeObjectURL(activeBlobUrl) }
  }, [url])

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPageNumber(1)
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center bg-muted/10">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <FileWarning className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-sm">{error}</p>
          <p className="text-xs text-muted-foreground max-w-60">
            The server rejected the request. You may need to refresh your session.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
          Retry Loading
        </Button>
      </div>
    )
  }

  return (
    // ✅ h-full fills parent exactly — parent (DocumentPrintPage) owns the height
    <div className={`flex flex-col h-full w-full overflow-hidden ${className ?? ''}`}>

      {/*
        ✅ THE FIX:
          - flex-1 min-h-0 → shrinks to available space, never expands beyond parent
          - overflow-y-auto → THIS is the ONE scroll container for the PDF
          - overflow-x-hidden → no horizontal scroll on mobile
          - w-full → fills container width
      */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden bg-muted/20 relative"
      >
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Rendering
              </span>
            </div>
          </div>
        )}

        {blobUrl && pageWidth > 0 && (
          <Document
            file={blobUrl}
            onLoadSuccess={onLoadSuccess}
            loading=""
            // ✅ No margin class — we control spacing via Page padding only
            className="flex justify-center py-4"
          >
            <Page
              pageNumber={pageNumber}
              // ✅ Fills container width exactly — no overflow, no gap
              width={pageWidth}
              renderTextLayer
              renderAnnotationLayer
            />
          </Document>
        )}
      </div>

      {/* Pagination — only rendered when needed, never causes scroll */}
      {numPages > 1 && (
        <div className="shrink-0 flex items-center gap-4 py-3 border-t bg-background w-full justify-center">
          <button
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="w-10 h-10 rounded-full border flex items-center justify-center disabled:opacity-20 hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="bg-muted px-3 py-1 rounded-full text-[11px] font-bold tabular-nums tracking-tighter">
            {pageNumber} / {numPages}
          </div>
          <button
            onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="w-10 h-10 rounded-full border flex items-center justify-center disabled:opacity-20 hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}
