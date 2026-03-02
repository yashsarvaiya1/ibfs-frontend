import api from '@/lib/axios'
import type {
  PaymentAccount, AccountCreate, AccountUpdate,
  TransferPayload, AdjustBalancePayload, SetBalancePayload
} from '@/models/account'
import type { PaginatedResponse } from '@/models/pagination'

export const accountService = {
  list: (params?: { is_active?: boolean }) =>
    api.get<PaginatedResponse<PaymentAccount>>('/accounts/', { params }).then(r => r.data),

  get: (id: number) =>
    api.get<PaymentAccount>(`/accounts/${id}/`).then(r => r.data),

  create: (data: AccountCreate) =>
    api.post<PaymentAccount>('/accounts/', data).then(r => r.data),

  update: (id: number, data: AccountUpdate) =>
    api.patch<PaymentAccount>(`/accounts/${id}/`, data).then(r => r.data),

  // POST /accounts/{id}/set_balance/ — direct overwrite, no f.txn (spec B1)
  setBalance: (id: number, data: SetBalancePayload) =>
    api.post<PaymentAccount>(`/accounts/${id}/set_balance/`, data).then(r => r.data),

  // POST /accounts/transfer/ — two contra f.txns (spec B2)
  transfer: (data: TransferPayload) =>
    api.post('/accounts/transfer/', data).then(r => r.data),

  // POST /accounts/{id}/adjust/ — actual f.txn, no contact (spec B3)
  adjust: (id: number, data: AdjustBalancePayload) =>
    api.post(`/accounts/${id}/adjust/`, data).then(r => r.data),
}
