'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useUIStore } from '@/stores/uiStore'

// Navigates to /documents/new?type=XXX&contact=YYY and closes immediately.
// useRef guard prevents double-navigation on StrictMode double-invoke.
export function DocCreateSheet() {
  const router = useRouter()
  const { docCreateSheetOpen, docCreateType, docCreateContactId, closeDocCreateSheet } =
    useUIStore()
  const handledRef = useRef(false)

  useEffect(() => {
    if (!docCreateSheetOpen || !docCreateType) {
      handledRef.current = false   // reset when closed
      return
    }
    if (handledRef.current) return
    handledRef.current = true

    closeDocCreateSheet()
    const params = new URLSearchParams({ type: docCreateType })
    if (docCreateContactId) params.set('contact', docCreateContactId.toString())
    router.push(`/documents/new?${params.toString()}`)
  }, [docCreateSheetOpen, docCreateType, docCreateContactId, closeDocCreateSheet, router])

  return null
}
