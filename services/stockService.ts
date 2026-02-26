// services/stockService.ts
import api from '@/lib/axios'
import type {
  StockTransaction,
  GlobalAdjustStockPayload,
  StockTransactionListParams,
  StockTransactionUpdatePayload,
} from '@/models/stock-transaction'
import type { PaginatedResponse } from '@/models/pagination'

export const stockService = {
  list: (params?: StockTransactionListParams) =>
    api.get<PaginatedResponse<StockTransaction>>('/stock-transactions/', { params }).then(r => r.data),

  get: (id: number) =>
    api.get<StockTransaction>(`/stock-transactions/${id}/`).then(r => r.data),

  update: (id: number, data: StockTransactionUpdatePayload) =>
    api.patch<StockTransaction>(`/stock-transactions/${id}/`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/stock-transactions/${id}/`),

  // POST /stock-transactions/adjust/ — standalone actual, no doc reference
  adjust: (data: GlobalAdjustStockPayload) =>
    api.post<StockTransaction>('/stock-transactions/adjust/', data).then(r => r.data),
}
