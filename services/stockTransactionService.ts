// services/stockTransactionService.ts

import api from '@/lib/axios'
import { StockTransaction, StockTransactionFormData } from '@/models/stockTransaction'
import { PaginatedResponse } from '@/models/pagination'

const BASE = '/inventory/stock-transactions'

export const stockTransactionService = {
  list: (params?: { page?: number; product?: number; document?: number }) =>
    api.get<PaginatedResponse<StockTransaction>>(`${BASE}/`, { params }),

  get: (id: number) =>
    api.get<StockTransaction>(`${BASE}/${id}/`),

  create: (data: StockTransactionFormData) =>
    api.post<StockTransaction>(`${BASE}/`, data),

  update: (id: number, data: Partial<StockTransactionFormData>) =>
    api.patch<StockTransaction>(`${BASE}/${id}/`, data),

  delete: (id: number) =>
    api.delete(`${BASE}/${id}/`),
}
