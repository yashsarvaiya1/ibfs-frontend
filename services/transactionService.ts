// services/transactionService.ts
import api from '@/lib/axios'
import type {
  FinancialTransaction,
  LinkDocumentPayload,
  TransactionListParams,
  TransactionUpdatePayload,
  TransactionPrintParams,
} from '@/models/transaction'
import type { PaginatedResponse } from '@/models/pagination'

export const transactionService = {
  list: (params?: TransactionListParams) =>
    api
      .get<PaginatedResponse<FinancialTransaction>>('/transactions/', { params })
      .then(r => r.data),

  get: (id: number) =>
    api.get<FinancialTransaction>(`/transactions/${id}/`).then(r => r.data),

  update: (id: number, data: TransactionUpdatePayload) =>
    api
      .patch<FinancialTransaction>(`/transactions/${id}/`, data)
      .then(r => r.data),

  delete: (id: number) =>
    api.delete(`/transactions/${id}/`),

  linkDocument: (id: number, data: LinkDocumentPayload) =>
    api
      .post<FinancialTransaction>(`/transactions/${id}/link-document/`, data)
      .then(r => r.data),

  /**
   * TV-06: Context-aware print.
   * - For ledger PDF: pass { view: 'ledger', contact, opening_balance_at, ...filters }
   * - For list / account PDF: pass { view: 'list', account, balance_before_period, ...filters }
   */
  print: (params?: TransactionPrintParams) =>
    api
      .get('/transactions/print/', { params, responseType: 'blob' })
      .then(r => r.data),
}
