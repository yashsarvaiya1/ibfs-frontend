// hooks/useStock.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stockService } from '@/services/stockService'
import { AdjustStockGlobalPayload } from '@/models/stock-transaction'

export const STOCK_KEY = ['stock-transactions']

export function useStockTransactions(params?: { product?: number; document?: number; type?: string; page?: number }) {
  return useQuery({
    queryKey: [...STOCK_KEY, params],
    queryFn: () => stockService.list(params),
  })
}

export function useGlobalAdjustStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AdjustStockGlobalPayload) => stockService.adjust(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STOCK_KEY })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
