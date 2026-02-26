// hooks/useDocuments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentService, DocumentListParams } from '@/services/documentService'
import { DocumentCreate, RecordPaymentPayload, MoveStockPayload, DeleteStrategy } from '@/models/document'

export const DOCUMENTS_KEY   = ['documents']
export const documentKey     = (id: number) => ['documents', id]
export const stockPreviewKey = (id: number) => ['documents', id, 'stock_preview']

export function useDocuments(params?: DocumentListParams) {
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, params],
    queryFn:  () => documentService.list(params),
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

export function useCreateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: DocumentCreate) => documentService.create(data),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useRecordPayment(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RecordPaymentPayload) => documentService.recordPayment(docId, data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: documentKey(docId) })
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useMoveStock(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: MoveStockPayload) => documentService.moveStock(docId, data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: stockPreviewKey(docId) })
      qc.invalidateQueries({ queryKey: documentKey(docId) })
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY })
      qc.invalidateQueries({ queryKey: ['products'] })
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
    mutationFn: (strategy: DeleteStrategy) => documentService.deleteDocument(docId, strategy),
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
    mutationFn: (data: Partial<DocumentCreate>) => documentService.update(id, data),
    onSuccess: () => {
      // Invalidate queries so the UI refreshes with the new data
      qc.invalidateQueries({ queryKey: documentKey(id) })
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY })
      qc.invalidateQueries({ queryKey: stockPreviewKey(id) })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}


