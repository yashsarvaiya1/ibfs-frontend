import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentService, DeleteResolutionPayload } from '@/services/documentService'
import { DocumentFormData, DocumentType, calculateDocumentTotal } from '@/models/document'
import { DocumentPaymentSummary } from '@/models/transaction'
import { transactionService } from '@/services/transactionService'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'

const KEY = 'documents'

export function useDocuments(params?: {
  page?: number
  type?: DocumentType
  contact?: number
}) {
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => documentService.list(params).then((r) => r.data),
    enabled: hasHydrated && isAuthenticated,
  })
}

export function useDocument(id: number) {
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => documentService.get(id).then((r) => r.data),
    enabled: !!id && hasHydrated && isAuthenticated,
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
    // Suppress default error — 409 conflict handled by caller
    // Caller checks error.response.status === 409 and opens resolution dialog
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

export function useDocumentPaymentSummary(
  documentId: number | null | undefined
) {
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { data: document } = useDocument(documentId ?? 0)

  return useQuery({
    queryKey: ['document-payment-summary', documentId],
    queryFn: async (): Promise<DocumentPaymentSummary> => {
      const total = document ? calculateDocumentTotal(document) : 0
      return transactionService.getDocumentPaymentSummary(documentId!, total)
    },
    enabled: !!documentId && !!document && hasHydrated && isAuthenticated,
    staleTime: 1000 * 30,
  })
}
