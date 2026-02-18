// services/paymentAccountService.ts

import api from '@/lib/axios'
import { PaymentAccount, PaymentAccountFormData } from '@/models/paymentAccount'
import { FinancialTransaction } from '@/models/transaction'
import { PaginatedResponse } from '@/models/pagination'

const BASE = '/accounting/payment-accounts'

export const paymentAccountService = {
  list: (params?: { page?: number }) =>
    api.get<PaginatedResponse<PaymentAccount>>(`${BASE}/`, { params }),

  get: (id: number) =>
    api.get<PaymentAccount>(`${BASE}/${id}/`),

  create: (data: PaymentAccountFormData) =>
    api.post<PaymentAccount>(`${BASE}/`, data),

  update: (id: number, data: Partial<PaymentAccountFormData>) =>
    api.patch<PaymentAccount>(`${BASE}/${id}/`, data),

  delete: (id: number) =>
    api.delete(`${BASE}/${id}/`),

  // Statement view — payment + contra transactions for this account only
  // No record transactions shown in account statement
  getStatement: (id: number, params?: { page?: number; date_from?: string; date_to?: string }) =>
    api.get<PaginatedResponse<FinancialTransaction>>(`/accounting/transactions/`, {
      params: {
        account: id,
        ...params,
      },
    }),
}
