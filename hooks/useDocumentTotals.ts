'use client'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { DocumentCreate } from '@/models/document'

export interface CalculatedTotals { total: string | number; tax_total: string | number; taxable_amount: string | number; taxes: { name: string; percentage: string | number; amount: string | number }[] }

export function useDocumentTotals(data: DocumentCreate, enabled: boolean) {
  const serialized = JSON.stringify(data)
  const [settled, setSettled] = useState(serialized)
  useEffect(() => { const timer = setTimeout(() => setSettled(serialized), 250); return () => clearTimeout(timer) }, [serialized])
  const query = useQuery({ queryKey: ['document-totals', settled], queryFn: ({ signal }) => api.post<CalculatedTotals>('/documents/preview_totals/', JSON.parse(settled), { signal }).then(r => r.data), enabled, retry: false, staleTime: 60_000 })
  return { ...query, ready: enabled && settled === serialized && !query.isFetching && !!query.data }
}
