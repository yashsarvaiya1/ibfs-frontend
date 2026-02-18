// hooks/useStockTransaction.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stockTransactionService } from '@/services/stockTransactionService'
import { StockTransactionFormData } from '@/models/stockTransaction'
import { toast } from 'sonner'

const KEY = 'stock-transactions'

export function useStockTransactions(params?: { page?: number; product?: number }) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => stockTransactionService.list(params).then((r) => r.data),
  })
}

export function useCreateStockTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: StockTransactionFormData) => stockTransactionService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Stock adjusted')
    },
    onError: () => toast.error('Failed to adjust stock'),
  })
}

export function useDeleteStockTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => stockTransactionService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Stock entry removed')
    },
    onError: () => toast.error('Failed to remove stock entry'),
  })
}
