// models/account.ts
export type AccountType = 'bank' | 'upi' | 'cash'

export interface PaymentAccount {
  id:              number
  type:            AccountType
  name:            string
  account_number:  string | null
  ifsc_code:       string | null
  upi_id:          string | null
  current_balance: string          // signed Decimal as string
  is_active:       boolean
  created_at:      string
  updated_at:      string
}

export type AccountCreate = Omit<PaymentAccount, 'id' | 'created_at' | 'updated_at'>
export type AccountUpdate = Partial<AccountCreate>

export interface TransferPayload {
  from_account: number
  to_account:   number
  amount:       string
  date?:        string
}

export interface AdjustBalancePayload {
  amount:  string
  notes?:  string
  date?:   string
}

export interface SetBalancePayload {
  current_balance: string | number
}

// ── Account transactions params (PaymentAccountViewSet.transactions) ──────────
export interface AccountTransactionsParams {
  date_from?:   string
  date_to?:     string
  type?:        'record' | 'actual' | 'contra'
  contact?:     number
  page?:        number
  page_size?:   number         // GD-03: 20 | 50 | 100
}

/**
 * Print params for account statement PDF (FinancialTransactionViewSet.print).
 * Pass ?view=list&account=<id>&balance_before_period=<val> to get account format.
 */
export interface AccountStatementPrintParams extends AccountTransactionsParams {
  account:                number
  view?:                  'list'          // always list for account statements
  balance_before_period?: string          // from AccountTransactionsResponse
}
