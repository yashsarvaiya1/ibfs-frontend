// hooks/usePaymentAccount.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentAccountService } from '@/services/paymentAccountService'
import { PaymentAccountFormData } from '@/models/paymentAccount'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'

const KEY = 'payment-accounts'

export function usePaymentAccounts(page = 1) {
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: [KEY, 'list', page],         // ← 'list' namespace
    queryFn: () => paymentAccountService.list({ page }).then((r) => r.data),
    enabled: hasHydrated && isAuthenticated,
  })
}

export function usePaymentAccount(id: number) {
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: [KEY, 'detail', id],         // ← 'detail' namespace
    queryFn: () => paymentAccountService.get(id).then((r) => r.data),
    enabled: !!id && hasHydrated && isAuthenticated,
  })
}

export function useAccountStatement(
  id: number,
  params?: { page?: number; date_from?: string; date_to?: string }
) {
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: [KEY, 'statement', id, params],
    queryFn: () => paymentAccountService.getStatement(id, params).then((r) => r.data),
    enabled: !!id && hasHydrated && isAuthenticated,
  })
}

export function useCreatePaymentAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PaymentAccountFormData) =>
      paymentAccountService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })  // invalidates all — list + detail
      toast.success('Account created')
    },
    onError: () => toast.error('Failed to create account'),
  })
}

export function useUpdatePaymentAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PaymentAccountFormData> }) =>
      paymentAccountService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Account updated')
    },
    onError: () => toast.error('Failed to update account'),
  })
}

export function useDeletePaymentAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => paymentAccountService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Account deleted')
    },
    onError: () => toast.error('Failed to delete account'),
  })
}
