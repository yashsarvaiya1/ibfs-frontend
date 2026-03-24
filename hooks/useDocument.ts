// hooks/useDocument.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentService } from '@/services/documentService'
// Import from canonical model source, not service re-export
import type { DocumentListParams } from '@/models/document'
import type {
  DocumentCreate, DocumentUpdate,
  RecordPaymentPayload, MarkPaidPayload,
  MoveStockPayload, DeleteDocumentPayload,
  StandaloneInterestPayload, BulkPrintPayload,
} from '@/models/document'
import { contactKey } from './useContact'

export const DOCUMENTS_KEY    = ['documents'] as const
export const documentKey      = (id: number) => ['documents', id] as const
export const stockPreviewKey  = (id: number) => ['documents', id, 'stock_preview'] as const
export const referenceDataKey = (id: number) => ['documents', id, 'reference_data'] as const

export function useDocuments(params?: DocumentListParams) {
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, params],
    queryFn:  () => documentService.list(params),
    enabled:  params !== undefined,
  })
}

export function useDocument(id: number) {
  return useQuery({
    queryKey: documentKey(id),
    queryFn:  () => documentService.get(id),
    enabled:  !!id,
  })
}

export function useStockPreview(id: number, enabled = true) {
  return useQuery({
    queryKey: stockPreviewKey(id),
    queryFn:  () => documentService.stockPreview(id),
    enabled:  !!id && enabled,
  })
}

export function useReferenceData(id: number | null) {
  return useQuery({
    queryKey: referenceDataKey(id as number),
    queryFn:  () => documentService.referenceData(id as number),
    enabled:  !!id,
  })
}

export function useCreateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: DocumentCreate) => documentService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateDocument(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: DocumentUpdate) => documentService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKey(id) })
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY })
      qc.invalidateQueries({ queryKey: stockPreviewKey(id) })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// Toggles is_paid flag — no f.txn created
export function useMarkPaid(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: MarkPaidPayload) => documentService.markPaid(docId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKey(docId) })
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY })
    },
  })
}

export function useRecordPayment(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RecordPaymentPayload) => documentService.recordPayment(docId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKey(docId) })
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useMoveStock(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: MoveStockPayload) => documentService.moveStock(docId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stockPreviewKey(docId) })
      qc.invalidateQueries({ queryKey: documentKey(docId) })
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-transactions'] })
    },
  })
}

export function useAddDetails(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (line_items: DocumentCreate['line_items']) =>
      documentService.addDetails(docId, { line_items: line_items ?? [] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKey(docId) })
      qc.invalidateQueries({ queryKey: stockPreviewKey(docId) })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteDocument(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: DeleteDocumentPayload) => documentService.deleteDocument(docId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKey(docId) })
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-transactions'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useStandaloneInterest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: StandaloneInterestPayload) => documentService.standaloneInterest(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      // ✅ refetchType: 'all' forces refetch even if component is unmounted/inactive
      qc.invalidateQueries({
        queryKey: ['contacts'],
        refetchType: 'all',
      })
    },
  })
}

// Single document PDF — returns blob for download/open
export function usePrintDocument() {
  return useMutation({
    mutationFn: (id: number) => documentService.print(id),
  })
}

/**
 * DV-04 / DV-05: Bulk print.
 * Pass { ids: [1,2,3] } to print selected documents.
 * Omit ids (or pass {}) to print the current filtered set on the backend.
 * Returns a PDF blob — trigger browser download in onSuccess.
 *
 * Usage:
 *   const { mutate: bulkPrint } = useBulkPrint()
 *   bulkPrint(
 *     { ids: selectedIds },
 *     { onSuccess: (blob) => downloadBlob(blob, 'Documents.pdf') }
 *   )
 */
export function useBulkPrint() {
  return useMutation({
    mutationFn: (payload?: BulkPrintPayload) => documentService.bulkPrint(payload),
  })
}
