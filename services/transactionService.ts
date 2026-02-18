// services/transactionService.ts

import api from '@/lib/axios'
import {
  FinancialTransaction,
  FinancialTransactionFormData,
  TransactionFilters,
  CreatePaymentWithInterestPayload,
  DocumentPaymentSummary,
} from '@/models/transaction'
import { DocumentFormData } from '@/models/document'
import { PaginatedResponse } from '@/models/pagination'

const BASE = '/accounting/transactions'
const DOC_BASE = '/accounting/documents'

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

  // ── Payment with optional Interest ──────────────────────────────────────────
  // If interest provided:
  //   Step 1 → Create Interest document
  //   Step 2 → Create payment txn (base + interest amount)
  // If no interest → plain payment transaction
  createWithInterest: async (payload: CreatePaymentWithInterestPayload) => {
    const baseAmount = parseFloat(payload.payment_amount)

    // Step 1 — Create interest document if provided
    if (payload.interest) {
      const interestDoc: DocumentFormData = {
        document_type: 'interest',
        contact: payload.contact,
        document_date: payload.interest.document_date,
        line_items: [
          {
            name: payload.interest.description,
            amount: parseFloat(payload.interest.amount),
          },
        ],
        notes: `Interest linked to payment on ${payload.transaction_date}`,
      }
      await api.post(`${DOC_BASE}/`, interestDoc)
    }

    // Step 2 — Create payment transaction
    const finalAmount = payload.interest
      ? (baseAmount + parseFloat(payload.interest.amount)).toFixed(2)
      : payload.payment_amount

    const txnData: FinancialTransactionFormData = {
      transaction_type: 'payment',
      transaction_date: payload.transaction_date,
      amount: finalAmount,
      contact: payload.contact,
      payment_account: payload.payment_account,
      document: payload.document ?? null,
      notes: payload.notes,
    }

    return api.post<FinancialTransaction>(`${BASE}/`, txnData)
  },

  // ── Document payment summary ─────────────────────────────────────────────────
  // Calculates total paid and remaining for a document
  getDocumentPaymentSummary: async (
    documentId: number,
    documentTotal: number
  ): Promise<DocumentPaymentSummary> => {
    const response = await api.get<PaginatedResponse<FinancialTransaction>>(
      `${BASE}/`,
      {
        params: {
          document: documentId,
          type: 'payment',
        },
      }
    )

    const payments = response.data.results
    const totalPaid = payments.reduce(
      (sum, txn) => sum + Math.abs(parseFloat(txn.amount)),
      0
    )
    const remaining = documentTotal - totalPaid

    return {
      document_id: documentId,
      document_total: documentTotal,
      total_paid: totalPaid,
      remaining,
      is_overpaid: remaining < 0,
    }
  },
}
