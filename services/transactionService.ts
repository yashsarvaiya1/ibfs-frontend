// services/transactionService.ts

import api from '@/lib/axios'
import {
  FinancialTransaction,
  FinancialTransactionFormData,
  TransactionFilters,
} from '@/models/transaction'
import { PaginatedResponse } from '@/models/pagination'

const BASE = '/accounting/transactions'

export const transactionService = {
  list: (params?: TransactionFilters) =>
    api.get<PaginatedResponse<FinancialTransaction>>(`${BASE}/`, { params }),

  get: (id: number) =>
    api.get<FinancialTransaction>(`${BASE}/${id}/`),

  create: (data: FinancialTransactionFormData) =>
    api.post<FinancialTransaction>(`${BASE}/`, data),

  update: (id: number, data: Partial<FinancialTransactionFormData>) =>
    api.patch<FinancialTransaction>(`${BASE}/${id}/`, data),

  delete: (id: number) =>
    api.delete(`${BASE}/${id}/`),
}
