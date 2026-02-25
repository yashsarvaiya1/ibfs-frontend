// hooks/useTransactions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionService } from '@/services/transactionService'
import { LinkDocumentPayload } from '@/models/transaction'

export const TRANSACTIONS_KEY = ['transactions']

export function useTransactions(params?: {
  contact?: number
  account?: number
  type?: string
  document?: number
  page?: number
}) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, params],
    queryFn:  () => transactionService.list(params),
  })
}

export function useLinkDocument(txnId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: LinkDocumentPayload) =>
      transactionService.linkDocument(txnId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
      qc.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

// ✅ NEW — update a transaction (amount / date / notes / account)
export function useUpdateTransaction(contactId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; [key: string]: any }) =>
      transactionService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts', contactId, 'ledger'] })
      qc.invalidateQueries({ queryKey: ['contacts', contactId] })
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
    },
  })
}

// ✅ NEW — delete a transaction
export function useDeleteTransaction(contactId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      transactionService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts', contactId, 'ledger'] })
      qc.invalidateQueries({ queryKey: ['contacts', contactId] })
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
    },
  })
}
