'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { ChevronLeft, ChevronRight, Loader2, FileWarning, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/axios'
import type { AxiosError } from 'axios'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface PdfViewerProps {
  url:        string
  className?: string
}

const MIN_SCALE = 1.0
const MAX_SCALE = 3.0
const SCALE_STEP = 0.3

export function PdfViewer({ url, className }: PdfViewerProps) {
  const [numPages,   setNumPages]   = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [pdfReady,   setPdfReady]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [blobUrl,    setBlobUrl]    = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [scale,      setScale]      = useState(1.0)

  // We render the PDF once at full container width, then CSS-scale it.
  // This avoids re-rendering react-pdf (which causes flicker) on every zoom step.
  const containerRef = useRef<HTMLDivElement>(null)
  const [baseWidth,  setBaseWidth]  = useState(0)

  // Pinch tracking — refs so no re-render during gesture
  const pinchStartDist  = useRef<number | null>(null)
  const pinchStartScale = useRef(1.0)

  useEffect(() => {
    const measure = () => {
      const el = containerRef.current
      if (!el) return
      const w = el.getBoundingClientRect().width
      if (w > 0) setBaseWidth(Math.floor(w))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let activeBlobUrl: string | null = null
    async function loadPdf() {
      setLoading(true)
      setPdfReady(false)
      setError(null)
      setBlobUrl(null)
      setScale(1.0)
      try {
        const response = await api.get<Blob>(url, { responseType: 'blob' })
        const blob = new Blob([response.data], { type: 'application/pdf' })
        activeBlobUrl = URL.createObjectURL(blob)
        setBlobUrl(activeBlobUrl)
      } catch (err: unknown) {
        const axiosErr = err as AxiosError
        const status   = axiosErr?.response?.status
        setError(
          status === 401 ? 'Session expired. Please log in again.'
          : status === 403 ? 'Access denied.'
          : status === 404 ? 'Document not found.'
          : 'Could not load document preview.',
        )
        setLoading(false)
      }
    }
    loadPdf()
    return () => { if (activeBlobUrl) URL.revokeObjectURL(activeBlobUrl) }
  }, [url, retryCount])

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPageNumber(1)
  }, [])

  const onPageRenderSuccess = useCallback(() => {
    setLoading(false)
    setPdfReady(true)
  }, [])

  // ── Pinch zoom — CSS transform only, no PDF re-render ────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchStartDist.current  = Math.hypot(dx, dy)
      pinchStartScale.current = scale
    }
  }, [scale])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || pinchStartDist.current === null) return
    e.preventDefault()
    const dx   = e.touches[0].clientX - e.touches[1].clientX
    const dy   = e.touches[0].clientY - e.touches[1].clientY
    const dist = Math.hypot(dx, dy)
    const next = pinchStartScale.current * (dist / pinchStartDist.current)
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, next)))
  }, [])

  const handleTouchEnd = useCallback(() => {
    pinchStartDist.current = null
  }, [])

  const zoomIn  = () => setScale(s => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(1)))
  const zoomOut = () => setScale(s => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(1)))

  const handleRetry = () => { setRetryCount(c => c + 1); setScale(1.0) }

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
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full w-full overflow-hidden ${className ?? ''}`}>

      {/* ── Scroll container ─────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 w-full overflow-auto bg-muted/20 relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        // When zoomed in allow free pan; at 1× let browser handle normally
        style={{ touchAction: scale > 1.01 ? 'none' : 'pan-y' }}
      >
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Rendering
            </span>
          </div>
        )}

        {/* CSS-scaled wrapper — scale() here, NOT on Page width */}
        <div
          style={{
            // transform-origin top-center so zoom expands downward/sideways
            transform:       `scale(${scale})`,
            transformOrigin: 'top center',
            // Make the outer container scrollable to the scaled size
            width:   `${100 / scale}%`,
            // Height expands naturally with content
          }}
        >
          {blobUrl && baseWidth > 0 && (
            <Document
              file={blobUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={err => { setError(`Render error: ${err.message}`); setLoading(false) }}
              loading={null}
              className="flex justify-center py-4"
            >
              <Page
                pageNumber={pageNumber}
                width={baseWidth}   // fixed — never changes, no re-render on zoom
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onRenderSuccess={onPageRenderSuccess}
                onRenderError={err => { setError(`Page render error: ${err.message}`); setLoading(false) }}
              />
            </Document>
          )}
        </div>
      </div>

      {/* ── Bottom controls bar — zoom + page nav ────────────────────────── */}
      {pdfReady && (
        <div className="shrink-0 flex items-center justify-between px-3 py-2 border-t bg-background gap-2">

          {/* Page navigation */}
          <div className="flex items-center gap-1.5">
            {numPages > 1 ? (
              <>
                <button
                  onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                  className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-25 hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[11px] font-bold tabular-nums bg-muted px-2 py-1 rounded-full min-w-11 text-center">
                  {pageNumber}/{numPages}
                </span>
                <button
                  onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                  disabled={pageNumber >= numPages}
                  className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-25 hover:bg-muted transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <span className="text-[11px] text-muted-foreground font-medium">1 page</span>
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={zoomOut}
              disabled={scale <= MIN_SCALE}
              className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-25 hover:bg-muted transition-colors"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-[11px] font-bold tabular-nums bg-muted px-2 py-1 rounded-full min-w-11 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={scale >= MAX_SCALE}
              className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-25 hover:bg-muted transition-colors"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            {scale > 1.01 && (
              <button
                onClick={() => setScale(1.0)}
                className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg border transition-colors"
              >
                Reset
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
