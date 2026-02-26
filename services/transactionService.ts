// services/transactionService.ts
import api from '@/lib/axios'
import { FinancialTransaction, LinkDocumentPayload, TransactionListParams } from '@/models/transaction'
import { PaginatedResponse } from '@/models/pagination'

export const transactionService = {
  list: (params?: TransactionListParams) =>
    api.get<PaginatedResponse<FinancialTransaction>>('/transactions/', { params }).then(r => r.data),

  get: (id: number) =>
    api.get<FinancialTransaction>(`/transactions/${id}/`).then(r => r.data),

  // fix: was using wrong prefix '/accounting/transactions/'
  update: (id: number, data: Partial<Pick<FinancialTransaction, 'amount' | 'date' | 'notes'> & { payment_account: number }>) =>
    api.patch<FinancialTransaction>(`/transactions/${id}/`, data).then(r => r.data),

  // fix: was using wrong prefix '/accounting/transactions/'
  delete: (id: number) =>
    api.delete(`/transactions/${id}/`),

  linkDocument: (id: number, data: LinkDocumentPayload) =>
    api.post<FinancialTransaction>(`/transactions/${id}/link_document/`, data).then(r => r.data),
}
