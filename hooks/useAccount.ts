// hooks/useAccounts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountService } from '@/services/accountService'
import { AccountCreate, AccountUpdate, TransferPayload, AdjustBalancePayload } from '@/models/account'

export const ACCOUNTS_KEY = ['accounts']
export const accountKey = (id: number) => ['accounts', id]

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

export function useSetBalance(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (balance: string) => accountService.setBalance(id, balance),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountKey(id) })
      qc.invalidateQueries({ queryKey: ACCOUNTS_KEY })
    },
  })
}
