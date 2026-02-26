// services/stockService.ts
import api from '@/lib/axios'
import { StockTransaction, AdjustStockGlobalPayload } from '@/models/stock-transaction'
import { PaginatedResponse } from '@/models/pagination'

export const stockService = {
  list: (params?: {
    product?: number
    document?: number
    type?: string
    page?: number
  }) =>
    api.get<PaginatedResponse<StockTransaction>>('/stock-transactions/', { params }).then(r => r.data),

  adjust: (data: AdjustStockGlobalPayload) =>
    api.post<StockTransaction>('/stock-transactions/adjust/', data).then(r => r.data),
}
