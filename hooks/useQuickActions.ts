// hooks/useQuickActions.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { quickActionService, QuickExpensePayload, QuickInterestPayload } from '@/services/quickActionService'

// Global expense — contact is optional (null for Quick Action global expense)
export function useQuickExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: QuickExpensePayload) => quickActionService.expense(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      // Only invalidate contacts if contact was provided
    },
  })
}

// Standalone interest — always linked to a contact
export function useQuickInterest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: QuickInterestPayload) => quickActionService.interest(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['contacts', vars.contact, 'ledger'] })
      qc.invalidateQueries({ queryKey: ['contacts', vars.contact] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}
