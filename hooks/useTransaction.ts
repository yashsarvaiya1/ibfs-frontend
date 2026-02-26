// hooks/useTransaction.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionService } from '@/services/transactionService'
import type {
  LinkDocumentPayload,
  TransactionListParams,
  TransactionUpdatePayload,
} from '@/models/transaction'

export const TRANSACTIONS_KEY = ['transactions'] as const
export const transactionKey   = (id: number) => ['transactions', id] as const

export function useTransactions(params?: TransactionListParams) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, params],
    queryFn: () => transactionService.list(params),
  })
}

export function useTransaction(id: number) {
  return useQuery({
    queryKey: transactionKey(id),
    queryFn: () => transactionService.get(id),
    enabled: !!id,
  })
}

export function useLinkDocument(txnId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: LinkDocumentPayload) => transactionService.linkDocument(txnId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transactionKey(txnId) })
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
      qc.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

// contactId optional — if provided, invalidates that contact's ledger + CF
// Uses TransactionUpdatePayload — id passed inline, not in payload
export function useUpdateTransaction(contactId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & TransactionUpdatePayload) =>
      transactionService.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: transactionKey(vars.id) })
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      if (contactId) {
        qc.invalidateQueries({ queryKey: ['contacts', contactId, 'ledger'] })
        qc.invalidateQueries({ queryKey: ['contacts', contactId] })
        qc.invalidateQueries({ queryKey: ['contacts'] })
      }
    },
  })
}

// Delete — backend reverses account balance automatically
export function useDeleteTransaction(contactId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => transactionService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      if (contactId) {
        qc.invalidateQueries({ queryKey: ['contacts', contactId, 'ledger'] })
        qc.invalidateQueries({ queryKey: ['contacts', contactId] })
        qc.invalidateQueries({ queryKey: ['contacts'] })
      }
    },
  })
}
