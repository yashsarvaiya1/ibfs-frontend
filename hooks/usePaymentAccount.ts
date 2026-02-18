// hooks/usePaymentAccount.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentAccountService } from '@/services/paymentAccountService'
import { PaymentAccountFormData } from '@/models/paymentAccount'
import { toast } from 'sonner'

const KEY = 'payment-accounts'

export function usePaymentAccounts(page = 1) {
  return useQuery({
    queryKey: [KEY, page],
    queryFn: () => paymentAccountService.list({ page }).then((r) => r.data),
  })
}

export function usePaymentAccount(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => paymentAccountService.get(id).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreatePaymentAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PaymentAccountFormData) => paymentAccountService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
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
    onSuccess: () => {
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
