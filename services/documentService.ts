// services/documentService.ts

import api from '@/lib/axios'
import { Document, DocumentFormData, DocumentType } from '@/models/document'
import { FinancialTransaction } from '@/models/transaction'
import { PaginatedResponse } from '@/models/pagination'

const BASE = '/accounting/documents'

// Only stock_transaction_actions needed now
// Payment transactions are always kept (never reverted)
export interface DeleteResolutionPayload {
  stock_transaction_actions: Record<string, 'revert' | 'keep'>
}

// Returned by backend on 409 — shows what stock entries exist
export interface DeleteConflictResponse {
  error: string
  detail: string
  has_stock_transactions: boolean
  stock_transactions: Array<{
    id: number
    product_id: number
    quantity: string
    transaction_date: string
    notes: string | null
  }>
}

export const documentService = {
  list: (params?: {
    page?: number
    type?: DocumentType
    contact?: number
    include_inactive?: boolean
  }) => api.get<PaginatedResponse<Document>>(`${BASE}/`, { params }),

  get: (id: number) =>
    api.get<Document>(`${BASE}/${id}/`),

  create: (data: DocumentFormData) =>
    api.post<Document>(`${BASE}/`, data),

  update: (id: number, data: Partial<DocumentFormData>) =>
    api.patch<Document>(`${BASE}/${id}/`, data),

  // Returns 204 on success
  // Returns 409 with stock_transactions list if stock entries exist
  // → caller must use deleteWithResolution instead
  delete: (id: number) =>
    api.delete(`${BASE}/${id}/`),

  // Full deletion with user choices per stock transaction
  deleteWithResolution: (id: number, payload: DeleteResolutionPayload) =>
    api.post(`${BASE}/${id}/delete_with_resolution/`, payload),

  // Fetch payment transactions for a document
  // Used to calculate total paid + remaining amount
  getPaymentTransactions: (id: number) =>
    api.get<PaginatedResponse<FinancialTransaction>>(`/accounting/transactions/`, {
      params: { document: id, type: 'payment' },
    }),
}
