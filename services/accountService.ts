// services/accountService.ts
import api from '@/lib/axios'
import { PaymentAccount, AccountCreate, AccountUpdate, TransferPayload, AdjustBalancePayload } from '@/models/account'
import { PaginatedResponse } from '@/models/pagination'

export const accountService = {
  list: (params?: { is_active?: boolean }) =>
    api.get<PaginatedResponse<PaymentAccount>>('/accounts/', { params }).then(r => r.data),

  get: (id: number) =>
    api.get<PaymentAccount>(`/accounts/${id}/`).then(r => r.data),

  create: (data: AccountCreate) =>
    api.post<PaymentAccount>('/accounts/', data).then(r => r.data),

  update: (id: number, data: AccountUpdate) =>
    api.patch<PaymentAccount>(`/accounts/${id}/`, data).then(r => r.data),

  transfer: (data: TransferPayload) =>
    api.post('/accounts/transfer/', data).then(r => r.data),

  adjust: (id: number, data: AdjustBalancePayload) =>
    api.post(`/accounts/${id}/adjust/`, data).then(r => r.data),

  setBalance: (id: number, balance: string) =>
    api.post<PaymentAccount>(`/accounts/${id}/set_balance/`, { current_balance: balance }).then(r => r.data),
}
