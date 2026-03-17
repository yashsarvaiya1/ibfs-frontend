// services/accountService.ts
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

  // Soft delete — sets is_active=False on backend
  delete: (id: number) =>
    api.delete(`/accounts/${id}/`).then(r => r.data),

  // FIX: DRF converts underscore action names to hyphens in URLs
  // set_balance action → /accounts/{id}/set-balance/ (not set_balance)
  setBalance: (id: number, data: SetBalancePayload) =>
    api.post<PaymentAccount>(`/accounts/${id}/set-balance/`, data).then(r => r.data),

  transfer: (data: TransferPayload) =>
    api.post('/accounts/transfer/', data).then(r => r.data),

  adjust: (id: number, data: AdjustBalancePayload) =>
    api.post(`/accounts/${id}/adjust/`, data).then(r => r.data),
}
