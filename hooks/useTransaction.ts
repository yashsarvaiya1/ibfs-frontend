// hooks/useTransactions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionService } from '@/services/transactionService'
import { LinkDocumentPayload, TransactionListParams } from '@/models/transaction'

export const TRANSACTIONS_KEY = ['transactions']
export const transactionKey   = (id: number) => ['transactions', id]

export function useTransactions(params?: TransactionListParams) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, params],
    queryFn:  () => transactionService.list(params),
  })
}

export function useTransaction(id: number) {
  return useQuery({
    queryKey: transactionKey(id),
    queryFn:  () => transactionService.get(id),
    enabled:  !!id,
  })
}

export function useLinkDocument(txnId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: LinkDocumentPayload) => transactionService.linkDocument(txnId, data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
      qc.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

// update a transaction — amount / date / notes / payment_account
// contactId is needed to invalidate the correct ledger cache
export function useUpdateTransaction(contactId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number
      amount?: string
      date?: string
      notes?: string
      payment_account?: number
    }) => transactionService.update(id, data),
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

// delete a transaction — always reverts account balance (per spec bug #9)
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
