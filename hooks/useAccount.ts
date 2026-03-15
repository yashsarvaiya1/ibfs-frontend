// hooks/useAccounts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountService } from '@/services/accountService'
import type {
  AccountCreate, AccountUpdate,
  TransferPayload, AdjustBalancePayload, SetBalancePayload
} from '@/models/account'

export const ACCOUNTS_KEY = ['accounts'] as const
export const accountKey   = (id: number) => ['accounts', id] as const

// Must match TRANSACTIONS_KEY exported from hooks/useTransaction.ts
// Partial key match — invalidates ALL transaction queries (all filters/params)
const TRANSACTIONS_BASE_KEY = ['transactions'] as const

export function useAccounts(params?: { is_active?: boolean }) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, params],
    queryFn:  () => accountService.list(params),
  })
}

export function useAccount(id: number) {
  return useQuery({
    queryKey: accountKey(id),
    queryFn:  () => accountService.get(id),
    enabled:  !!id,
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AccountCreate) => accountService.create(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
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

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => accountService.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  })
}

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACCOUNTS_KEY })
      // Two contra f.txns were created — transaction history must refresh
      qc.invalidateQueries({ queryKey: TRANSACTIONS_BASE_KEY })
    },
  })
}

export function useAdjustBalance(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AdjustBalancePayload) => accountService.adjust(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountKey(id) })
      qc.invalidateQueries({ queryKey: ACCOUNTS_KEY })
      // New actual f.txn was created — transaction history must refresh
      qc.invalidateQueries({ queryKey: TRANSACTIONS_BASE_KEY })
    },
  })
}
