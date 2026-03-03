'use client'

import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

interface DocumentPrintTriggerProps {
  documentId: number
  label?:     string
  variant?:   'default' | 'outline' | 'ghost'
  size?:      'default' | 'sm' | 'lg' | 'icon'
}

// Per spec Part 7 — GET /api/documents/{id}/print/ returns PDF file.
// Frontend just opens the URL in a new tab — browser handles download/print.
export function DocumentPrintTrigger({
  documentId,
  label   = 'Print / PDF',
  variant = 'outline',
  size    = 'sm',
}: DocumentPrintTriggerProps) {
  const handlePrint = () => {
    window.open(`${API_BASE}/api/documents/${documentId}/print/`, '_blank', 'noopener,noreferrer')
  }

  return (
    <Button variant={variant} size={size} onClick={handlePrint} className="gap-1.5">
      <FileDown className="h-4 w-4" />
      {label}
    </Button>
  )
}
