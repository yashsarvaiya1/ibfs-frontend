// components/shared/DocCreateSheet.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { DOC_TYPE_LABELS } from '@/models/document'

// This sheet just navigates to the doc creation page with type pre-filled
// Full document form is on /documents/new?type=XXX
export function DocCreateSheet() {
  const router = useRouter()
  const { docCreateSheetOpen, docCreateType, docCreateContactId, closeDocCreateSheet } = useUIStore()

  useEffect(() => {
    if (docCreateSheetOpen && docCreateType) {
      closeDocCreateSheet()
      const params = new URLSearchParams({ type: docCreateType })
      if (docCreateContactId) params.set('contact', docCreateContactId.toString())
      router.push(`/documents/new?${params.toString()}`)
    }
  }, [docCreateSheetOpen, docCreateType, docCreateContactId, closeDocCreateSheet, router])

  return null
}
