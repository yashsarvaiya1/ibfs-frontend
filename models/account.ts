export type AccountType = 'bank' | 'upi' | 'cash'

export interface PaymentAccount {
  id: number
  type: AccountType
  name: string
  account_number: string | null
  ifsc_code: string | null
  upi_id: string | null
  current_balance: string   // signed Decimal as string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AccountCreate = Omit<PaymentAccount, 'id' | 'created_at' | 'updated_at'>
export type AccountUpdate = Partial<AccountCreate>

export interface TransferPayload {
  from_account: number
  to_account: number
  amount: string
  date?: string
}

export interface AdjustBalancePayload {
  amount: string
  notes?: string
  date?: string
}

// Matches backend: action(detail=True, methods=['post']) def set_balance(...)
export interface SetBalancePayload {
  current_balance: string | number
}
