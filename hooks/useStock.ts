// hooks/useStock.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stockService } from '@/services/stockService'
import type {
  GlobalAdjustStockPayload,
  StockTransactionListParams,
  StockTransactionUpdatePayload,
} from '@/models/stock-transaction'

export const STOCK_KEY    = ['stock-transactions'] as const
export const stockTxnKey  = (id: number) => ['stock-transactions', id] as const

export function useStockTransactions(params?: StockTransactionListParams) {
  return useQuery({
    queryKey: [...STOCK_KEY, params],
    queryFn:  () => stockService.list(params),
  })
}

export function useStockTransaction(id: number) {
  return useQuery({
    queryKey: stockTxnKey(id),
    queryFn:  () => stockService.get(id),
    enabled:  !!id,
  })
}

export function useUpdateStockTransaction(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: StockTransactionUpdatePayload) => stockService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stockTxnKey(id) })
      qc.invalidateQueries({ queryKey: STOCK_KEY })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteStockTransaction(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => stockService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STOCK_KEY })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useGlobalAdjustStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GlobalAdjustStockPayload) => stockService.adjust(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STOCK_KEY })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
