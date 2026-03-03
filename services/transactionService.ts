import api from '@/lib/axios'
import type {
  FinancialTransaction,
  LinkDocumentPayload,
  TransactionListParams,
  TransactionUpdatePayload,
} from '@/models/transaction'
import type { PaginatedResponse } from '@/models/pagination'

export const transactionService = {
  list: (params?: TransactionListParams) =>
    api.get<PaginatedResponse<FinancialTransaction>>('/transactions/', { params }).then(r => r.data),

  get: (id: number) =>
    api.get<FinancialTransaction>(`/transactions/${id}/`).then(r => r.data),

  // Only actual f.txns — backend blocks record edits with 400
  update: (id: number, data: TransactionUpdatePayload) =>
    api.patch<FinancialTransaction>(`/transactions/${id}/`, data).then(r => r.data),

  // Only actual f.txns — backend blocks record deletes with 400
  // Reverses account balance automatically on backend
  delete: (id: number) =>
    api.delete(`/transactions/${id}/`),

  linkDocument: (id: number, data: LinkDocumentPayload) =>
    api.post<FinancialTransaction>(`/transactions/${id}/link_document/`, data).then(r => r.data),

  // GET /transactions/print/ — returns PDF blob. Pass ?contact={id} for Ledger view
  print: (params?: TransactionListParams) =>
    api.get('/transactions/print/', { params, responseType: 'blob' }).then(r => r.data),
}
