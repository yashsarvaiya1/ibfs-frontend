// hooks/useDocuments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentService } from '@/services/documentService'
import { DocumentCreate, RecordPaymentPayload, MoveStockPayload, DeleteStrategy } from '@/models/document'

export const DOCUMENTS_KEY = ['documents']
export const documentKey = (id: number) => ['documents', id]
export const stockPreviewKey = (id: number) => ['documents', id, 'stock_preview']

export function useDocuments(params?: { type?: string; contact?: number; page?: number; search?: string }) {
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, params],
    queryFn: () => documentService.list(params),
  })
}

export function useDocument(id: number) {
  return useQuery({
    queryKey: documentKey(id),
    queryFn: () => documentService.get(id),
    enabled: !!id,
  })
}

export function useStockPreview(id: number) {
  return useQuery({
    queryKey: stockPreviewKey(id),
    queryFn: () => documentService.stockPreview(id),
    enabled: !!id,
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
    },
  })
}

export function useRecordPayment(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RecordPaymentPayload) => documentService.recordPayment(docId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKey(docId) })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useMoveStock(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: MoveStockPayload) => documentService.moveStock(docId, data),
    onSuccess: () => {
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
