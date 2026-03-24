// hooks/useTransactions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionService } from '@/services/transactionService'
import type {
  LinkDocumentPayload,
  TransactionListParams,
  TransactionUpdatePayload,
  TransactionPrintParams,
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
        // Partial key invalidates all ledger filter combos for this contact
        qc.invalidateQueries({ queryKey: ['contacts', contactId, 'ledger'] })
        qc.invalidateQueries({ queryKey: ['contacts', contactId] })
        qc.invalidateQueries({ queryKey: ['contacts'] })
      }
    },
  })
}

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

/**
 * TV-06: Context-aware transaction PDF print.
 *
 * For ledger PDF:
 *   mutate({ view: 'ledger', contact: id, opening_balance_at: data.opening_balance_at, ...filters })
 *
 * For account statement PDF:
 *   mutate({ view: 'list', account: id, balance_before_period: data.balance_before_period, ...filters })
 *
 * For plain transaction list PDF:
 *   mutate({ view: 'list', ...filters })
 *
 * Returns a PDF blob — trigger download in onSuccess.
 */
export function usePrintTransactions() {
  return useMutation({
    mutationFn: (params?: TransactionPrintParams) => transactionService.print(params),
  })
}
