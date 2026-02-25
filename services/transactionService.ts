// services/transactionService.ts
import api from '@/lib/axios'
import { FinancialTransaction, LinkDocumentPayload } from '@/models/transaction'
import { PaginatedResponse } from '@/models/pagination'

export const transactionService = {
  list: (params?: {
    contact?: number
    account?: number
    type?: string
    document?: number
    page?: number
  }) =>
    api.get<PaginatedResponse<FinancialTransaction>>('/transactions/', { params }).then(r => r.data),

  get: (id: number) =>
    api.get<FinancialTransaction>(`/transactions/${id}/`).then(r => r.data),

  update: (id: number, data: any) =>
  api.patch(`/accounting/transactions/${id}/`, data).then(r => r.data),

    delete: (id: number) =>
    api.delete(`/accounting/transactions/${id}/`),

  linkDocument: (id: number, data: LinkDocumentPayload) =>
    api.post<FinancialTransaction>(`/transactions/${id}/link_document/`, data).then(r => r.data),
}
