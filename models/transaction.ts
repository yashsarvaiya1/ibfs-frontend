import type { InterestLine } from './document'

export type TransactionType = 'record' | 'actual' | 'contra'

export interface FinancialTransaction {
  id:                       number
  type:                     'record' | 'actual' | 'contra'
  date:                     string          // ISO "YYYY-MM-DD"
  amount:                   string          // DecimalField comes as string from DRF
  document:                 number | null   // FK id
  contact:                  number | null   // FK id
  payment_account:          number | null   // FK id
  notes:                    string | null
  monthly_cumulative_delta: string          // DecimalField as string
  created_at:               string
  updated_at:               string
  document_type:            string | null   // e.g. "bill", "invoice"
  is_document_deleted:      boolean
}

export type { InterestLine }

export interface SendReceivePayload {
  amount:           string
  payment_account?: number
  date?:            string
  notes?:           string
  document?:        number
  is_expense?:      boolean
  line_items?:      { name: string; amount: number }[]
  interest_lines?:  InterestLine[]
}

export interface LinkDocumentPayload {
  document: number | null
}

export interface TransactionListParams {
  contact?:             number
  account?:             number
  type?:                TransactionType
  document?:            number
  date_from?:           string
  date_to?:             string
  is_document_deleted?: boolean
  include_records?:     boolean
  page?:                number
  page_size?:           number
}

export interface TransactionUpdatePayload {
  amount?:          string
  date?:            string
  notes?:           string
  payment_account?: number | null
}
