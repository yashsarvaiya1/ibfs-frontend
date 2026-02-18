// hooks/useTransaction.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionService } from '@/services/transactionService'
import {
  FinancialTransactionFormData,
  TransactionFilters,
  CreatePaymentWithInterestPayload,
} from '@/models/transaction'
import { toast } from 'sonner'

const KEY = 'transactions'

export function useTransactions(params?: TransactionFilters) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => transactionService.list(params).then((r) => r.data),
  })
}

export function useTransaction(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => transactionService.get(id).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FinancialTransactionFormData) =>
      transactionService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['payment-accounts'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Transaction created')
    },
    onError: () => toast.error('Failed to create transaction'),
  })
}

// ── Payment with optional Interest ────────────────────────────────────────────
// Used in payment form from both Contact Detail and Quick Action
// If interest provided → creates Interest document first, then payment txn
export function useCreatePaymentWithInterest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePaymentWithInterestPayload) =>
      transactionService.createWithInterest(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['payment-accounts'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Payment recorded')
    },
    onError: () => toast.error('Failed to record payment'),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Partial<FinancialTransactionFormData>
    }) => transactionService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [KEY, id] })
      qc.invalidateQueries({ queryKey: ['payment-accounts'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Transaction updated')
    },
    onError: () => toast.error('Failed to update transaction'),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => transactionService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['payment-accounts'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Transaction deleted')
    },
    onError: () => toast.error('Failed to delete transaction'),
  })
}
