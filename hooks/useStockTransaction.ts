// hooks/useStockTransaction.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stockTransactionService } from '@/services/stockTransactionService'
import { StockTransactionFormData } from '@/models/stockTransaction'
import { toast } from 'sonner'

const KEY = 'stock-transactions'

export function useStockTransactions(params?: {
  page?: number
  product?: number
  document?: number
}) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => stockTransactionService.list(params).then((r) => r.data),
    enabled: !!params?.product || params?.product === undefined,
  })
}

// Single stock transaction — used in detail/edit views
export function useStockTransaction(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => stockTransactionService.get(id).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateStockTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: StockTransactionFormData) =>
      stockTransactionService.create(data),
    onSuccess: (_, data) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['products'] })
      // Invalidate specific product if known
      if (data.product) {
        qc.invalidateQueries({ queryKey: ['products', data.product] })
      }
      toast.success('Stock adjusted')
    },
    onError: () => toast.error('Failed to adjust stock'),
  })
}

export function useUpdateStockTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Partial<StockTransactionFormData>
    }) => stockTransactionService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Stock entry updated')
    },
    onError: () => toast.error('Failed to update stock entry'),
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
