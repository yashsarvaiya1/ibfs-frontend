// services/quickActionService.ts
import api from '@/lib/axios'

export interface QuickExpensePayload {
  contact?: number                // optional — null for global expense
  payment_account?: number
  date?: string
  line_items: { name: string; amount: number }[]
  notes?: string
  attachment_urls?: string[]      // Added for bug #5
}

export interface QuickInterestPayload {
  contact: number                 // required — always linked to a contact
  date?: string
  line_items: { name: string; amount: number }[]
  action: 'charge' | 'credit'    // charge = negative, credit = positive
  notes?: string
  attachment_urls?: string[]      // Added for bug #5
}

export const quickActionService = {
  // POST /api/quick-actions/expense/
  expense: (data: QuickExpensePayload) =>
    api.post('/quick-actions/expense/', data).then(r => r.data),

  // POST /api/quick-actions/interest/
  interest: (data: QuickInterestPayload) =>
    api.post('/quick-actions/interest/', data).then(r => r.data),
}
