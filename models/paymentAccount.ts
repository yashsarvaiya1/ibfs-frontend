// models/paymentAccount.ts

export type AccountType = 'bank' | 'upi' | 'cash'

export interface PaymentAccount {
  id: number
  name: string
  account_type: AccountType
  account_number: string | null
  ifsc_code: string | null
  upi_id: string | null
  current_balance: string
  created_at: string
  updated_at: string
}

export interface PaymentAccountFormData {
  name: string
  account_type: AccountType
  account_number?: string
  ifsc_code?: string
  upi_id?: string
  current_balance?: string
}
