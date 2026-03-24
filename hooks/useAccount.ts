// hooks/useAccounts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountService } from '@/services/accountService'
import type {
  AccountCreate, AccountUpdate,
  TransferPayload, AdjustBalancePayload, SetBalancePayload,
  AccountTransactionsParams,
} from '@/models/account'

export const ACCOUNTS_KEY = ['accounts'] as const
export const accountKey   = (id: number) => ['accounts', id] as const

// Partial key — invalidates ALL transaction queries
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
      qc.invalidateQueries({ queryKey: TRANSACTIONS_BASE_KEY })
    },
  })
}

/**
 * Paginated transaction history for a single payment account.
 * Returns AccountTransactionsResponse which includes balance_before_period.
 * Use balance_before_period as the "Balance B/F" row in account statement views.
 */
export const accountTxnsKey = (id: number, params?: AccountTransactionsParams) =>
  ['accounts', id, 'transactions', params] as const

export function useAccountTransactions(
  id: number,
  params?: AccountTransactionsParams,
) {
  return useQuery({
    queryKey: accountTxnsKey(id, params),
    queryFn:  () => accountService.transactions(id, params),
    enabled:  !!id,
  })
}
