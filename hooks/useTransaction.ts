// hooks/useTransaction.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionService } from '@/services/transactionService'
import { FinancialTransactionFormData, TransactionFilters } from '@/models/transaction'
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
    mutationFn: (data: FinancialTransactionFormData) => transactionService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['payment-accounts'] })
      toast.success('Transaction created')
    },
    onError: () => toast.error('Failed to create transaction'),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FinancialTransactionFormData> }) =>
      transactionService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['payment-accounts'] })
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
      toast.success('Transaction deleted')
    },
    onError: () => toast.error('Failed to delete transaction'),
  })
}
