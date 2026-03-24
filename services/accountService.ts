// services/accountService.ts
import api from '@/lib/axios'
import type {
  PaymentAccount,
  AccountCreate,
  AccountUpdate,
  TransferPayload,
  AdjustBalancePayload,
  SetBalancePayload,
  AccountTransactionsParams,
} from '@/models/account'
import type {
  PaginatedResponse,
  AccountTransactionsResponse,
} from '@/models/pagination'

export const accountService = {
  list: (params?: { is_active?: boolean }) =>
    api
      .get<PaginatedResponse<PaymentAccount>>('/accounts/', { params })
      .then(r => r.data),

  get: (id: number) =>
    api.get<PaymentAccount>(`/accounts/${id}/`).then(r => r.data),

  create: (data: AccountCreate) =>
    api.post<PaymentAccount>('/accounts/', data).then(r => r.data),

  update: (id: number, data: AccountUpdate) =>
    api.patch<PaymentAccount>(`/accounts/${id}/`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/accounts/${id}/`).then(r => r.data),

  setBalance: (id: number, data: SetBalancePayload) =>
    api
      .post<PaymentAccount>(`/accounts/${id}/set-balance/`, data)
      .then(r => r.data),

  transfer: (data: TransferPayload) =>
    api.post('/accounts/transfer/', data).then(r => r.data),

  adjust: (id: number, data: AdjustBalancePayload) =>
    api.post(`/accounts/${id}/adjust/`, data).then(r => r.data),

  /**
   * Payment account transaction history (PaymentAccountViewSet.transactions).
   * Newest first, paginated, includes balance_before_period.
   */
  transactions: (id: number, params?: AccountTransactionsParams) =>
    api
      .get<AccountTransactionsResponse>(
        `/accounts/${id}/transactions/`,
        { params },
      )
      .then(r => r.data),
}
