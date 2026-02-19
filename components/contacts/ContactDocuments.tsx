'use client'

import { useRouter } from 'next/navigation'
import { useDocuments } from '@/hooks/useDocument'
import { DOCUMENT_TYPE_LABELS, calculateDocumentTotal } from '@/models/document'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface Props {
  contactId: number
}

export function ContactDocuments({ contactId }: Props) {
  const router = useRouter()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useDocuments({ contact: contactId, page })
  const documents = data?.results ?? []
  const totalCount = data?.count ?? 0
  const hasNext = !!data?.next
  const hasPrev = !!data?.previous

  if (isLoading) {
    return (
      <div className="divide-y">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 py-3 space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">No documents yet</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="divide-y">
        {documents.map((doc) => {
          const total = calculateDocumentTotal(doc)
          return (
            <button
              key={doc.id}
              onClick={() => router.push(`/documents/${doc.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {DOCUMENT_TYPE_LABELS[doc.document_type]}
                  </Badge>
                  {doc.document_number && (
                    <span className="text-xs text-muted-foreground">
                      #{doc.document_number}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {doc.document_date
                    ? (() => {
                        const [y, m, d] = doc.document_date.split('-')
                        return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]} ${y}`
                      })()
                    : 'No date'}
                </p>
              </div>

              <div className="text-right shrink-0 flex items-center gap-2">
                <p className="text-sm font-semibold">
                  ₹{total.toLocaleString('en-IN')}
                </p>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          )
        })}
      </div>

      {/* Pagination — only shown if more than one page */}
      {(hasNext || hasPrev) && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={!hasPrev}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            {totalCount} documents
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
