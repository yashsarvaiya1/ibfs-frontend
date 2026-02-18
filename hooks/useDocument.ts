// hooks/useDocument.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentService, DeleteResolutionPayload } from '@/services/documentService'
import { DocumentFormData, DocumentType } from '@/models/document'
import { toast } from 'sonner'

const KEY = 'documents'

export function useDocuments(params?: {
  page?: number
  type?: DocumentType
  contact?: number
}) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => documentService.list(params).then((r) => r.data),
  })
}

export function useDocument(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => documentService.get(id).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: DocumentFormData) => documentService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Document created')
    },
    onError: () => toast.error('Failed to create document'),
  })
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DocumentFormData> }) =>
      documentService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [KEY, id] })
      toast.success('Document updated')
    },
    onError: () => toast.error('Failed to update document'),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => documentService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Document deleted')
    },
    // Suppress default error — 409 handled by caller (resolution dialog)
    onError: () => {},
  })
}

export function useDeleteDocumentWithResolution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: DeleteResolutionPayload }) =>
      documentService.deleteWithResolution(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['payment-accounts'] })
      toast.success('Document deleted')
    },
    onError: () => toast.error('Failed to delete document'),
  })
}
