import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountService } from '@/services/accountService'
import type { AccountCreate, AccountUpdate, TransferPayload, AdjustBalancePayload, SetBalancePayload } from '@/models/account'

export const ACCOUNTS_KEY = ['accounts'] as const
export const accountKey = (id: number) => ['accounts', id] as const

export function useAccounts(params?: { is_active?: boolean }) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, params],
    queryFn: () => accountService.list(params),
  })
}

export function useAccount(id: number) {
  return useQuery({
    queryKey: accountKey(id),
    queryFn: () => accountService.get(id),
    enabled: !!id,
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AccountCreate) => accountService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  })
}

export function useUpdateAccount(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AccountUpdate) => accountService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountKey(id) })
      qc.invalidateQueries({ queryKey: ACCOUNTS_KEY })
    },
  })
}

// Direct balance overwrite — PATCH current_balance, no f.txn (spec B1)
export function useSetBalance(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SetBalancePayload) => accountService.setBalance(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountKey(id) })
      qc.invalidateQueries({ queryKey: ACCOUNTS_KEY })
    },
  })
}

export function useTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TransferPayload) => accountService.transfer(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  })
}

export function useAdjustBalance(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AdjustBalancePayload) => accountService.adjust(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountKey(id) })
      qc.invalidateQueries({ queryKey: ACCOUNTS_KEY })
    },
  })
}
