'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { ChevronLeft, ChevronRight, Loader2, FileWarning, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/axios'
import type { AxiosError } from 'axios'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface PdfViewerProps {
  url:       string
  className?: string
}

export function PdfViewer({ url, className }: PdfViewerProps) {
  const [numPages,    setNumPages]   = useState<number>(0)
  const [pageNumber,  setPageNumber] = useState<number>(1)
  const [loading,     setLoading]    = useState(true)
  const [error,       setError]      = useState<string | null>(null)
  const [blobUrl,     setBlobUrl]    = useState<string | null>(null)
  // Incrementing this triggers a re-fetch without changing url
  const [retryCount,  setRetryCount] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const [pageWidth,   setPageWidth]  = useState<number>(0)

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
    setPageWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Re-runs when url OR retryCount changes
  useEffect(() => {
    let activeBlobUrl: string | null = null

    async function loadPdf() {
      try {
        setLoading(true)
        setError(null)
        setBlobUrl(null)
        const response = await api.get<Blob>(url, { responseType: 'blob' })
        const blob = new Blob([response.data], { type: 'application/pdf' })
        activeBlobUrl = URL.createObjectURL(blob)
        setBlobUrl(activeBlobUrl)
      } catch (err: unknown) {
        const axiosErr = err as AxiosError
        const status   = axiosErr?.response?.status
        setError(
          status === 401
            ? 'Session expired. Please log in again.'
            : status === 403
            ? 'Access denied.'
            : status === 404
            ? 'Document not found.'
            : 'Could not load document preview.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadPdf()
    return () => {
      // Revoke previous blob on url/retry change to prevent memory leaks
      if (activeBlobUrl) URL.revokeObjectURL(activeBlobUrl)
    }
  }, [url, retryCount])

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPageNumber(1)
  }, [])

  const handleRetry = () => setRetryCount(c => c + 1)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center bg-muted/10">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <FileWarning className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-sm">{error}</p>
          <p className="text-xs text-muted-foreground max-w-60">
            Check your connection or session and try again.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleRetry} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full w-full overflow-hidden ${className ?? ''}`}>
      <div
        ref={containerRef}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden bg-muted/20 relative"
      >
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
            // Surface render errors without crashing
            onLoadError={(err) => setError(`Render error: ${err.message}`)}
            loading=""
            className="flex justify-center py-4"
          >
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              renderTextLayer
              renderAnnotationLayer
            />
          </Document>
        )}
      </div>

      {numPages > 1 && (
        <div className="shrink-0 flex items-center gap-4 py-3 border-t bg-background w-full justify-center">
          <button
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            aria-label="Previous page"
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
            aria-label="Next page"
            className="w-10 h-10 rounded-full border flex items-center justify-center disabled:opacity-20 hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}
