'use client'

import { useState, useCallback, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, FileWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/axios' // Your authenticated axios instance

// Worker setup
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface PdfViewerProps {
  url: string
  className?: string
}

export function PdfViewer({ url, className }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  // ── Authenticated PDF Fetch ──────────────────────────────────────────
  useEffect(() => {
    let activeBlobUrl: string | null = null

    async function loadPdf() {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch raw PDF data using authenticated axios
        const response = await api.get(url, { responseType: 'blob' })
        
        // Create a local URL for the PDF data
        const blob = new Blob([response.data], { type: 'application/pdf' })
        activeBlobUrl = URL.createObjectURL(blob)
        setBlobUrl(activeBlobUrl)
      } catch (err: any) {
        console.error("PDF Load Error:", err)
        if (err.response?.status === 401) {
          setError("Session expired or unauthorized. Please log in again.")
        } else {
          setError("Could not load document preview.")
        }
      } finally {
        setLoading(false)
      }
    }

    loadPdf()

    // Cleanup memory when component unmounts
    return () => {
      if (activeBlobUrl) URL.revokeObjectURL(activeBlobUrl)
    }
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
          <p className="font-semibold">{error}</p>
          <p className="text-xs text-muted-foreground max-w-[240px]">
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
    <div className={`flex flex-col h-full ${className ?? ''}`}>
      <div className="flex-1 overflow-y-auto w-full flex justify-center bg-muted/20 relative">
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Rendering</span>
            </div>
          </div>
        )}

        {blobUrl && (
          <Document
            file={blobUrl}
            onLoadSuccess={onLoadSuccess}
            loading=""
            className="shadow-2xl my-4"
          >
            <Page
              pageNumber={pageNumber}
              // Dynamically adjust width for mobile vs desktop
              width={Math.min(typeof window !== 'undefined' ? window.innerWidth - 32 : 360, 800)}
              renderTextLayer
              renderAnnotationLayer
            />
          </Document>
        )}
      </div>

      {numPages > 1 && (
        <div className="shrink-0 flex items-center gap-4 py-3 border-t bg-background/95 backdrop-blur w-full justify-center">
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
