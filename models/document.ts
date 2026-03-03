import type { FinancialTransaction } from './transaction'

export type DeleteStrategy = 'revert' | 'manual'

export interface DeleteDocumentPayload {
  strategy: DeleteStrategy
}

export type DocumentType =
  | 'bill' | 'invoice'
  | 'po' | 'pi' | 'quotation'
  | 'challan'
  | 'cn' | 'dn'
  | 'cash_payment_voucher' | 'cash_receipt_voucher'
  | 'interest' | 'expense'

export interface LineItem {
  name: string
  hsn?: string
  quantity?: number
  rate?: number
  amount?: number
  product_id?: number | null
}

export interface Charge {
  name: string
  amount: number
}

export interface Tax {
  name: string
  percentage: number
}

export interface InterestLine {
  name: string
  amount: number
  type: 'charge' | 'discount'
}

export interface PaymentStatusDetail {
  record: string
  paid: string
  remaining: string
  is_paid: boolean
}

export interface PaymentStatusSummary {
  remaining: string
  is_paid: boolean
}

export interface StockStatusItem {
  product_id: number
  product_name: string
  record_qty: string
  moved_qty: string
  remaining_qty: string
  is_moved: boolean
}

export interface Document {
  id: number
  type: DocumentType
  doc_id: string
  contact: number | null
  consignee: number | null
  reference: number | null
  line_items: LineItem[]
  total_amount: string | null
  discount: string
  charges: Charge[]
  taxes: Tax[]
  date: string
  due_date: string | null
  payment_terms: string | null
  attachment_urls: string[]        // relative paths — stored in DB
  attachment_urls_full: string[]   // absolute URLs — emitted by DocumentSerializer
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  transactions?: FinancialTransaction[]
  payment_status: PaymentStatusDetail | null
  stock_status: StockStatusItem[] | null

  contact_display?:   ContactDisplay | null
  consignee_display?: ConsigneeDisplay | null
}

export interface DocumentListItem {
  id: number
  type: DocumentType
  doc_id: string
  contact: number | null
  contact_name: string | null
  date: string
  total_amount: string | null
  is_active: boolean
  payment_status: PaymentStatusSummary | null
}

export interface DocumentCreate {
  type: DocumentType
  contact?: number
  consignee?: number
  reference?: number
  line_items?: LineItem[]
  total_amount?: string | number
  discount?: number
  charges?: Charge[]
  taxes?: Tax[]
  date: string
  due_date?: string
  payment_terms?: string
  attachment_urls?: string[]
  notes?: string
  payment_account?: number
  interest_lines?:     { name: string; amount: number; type: 'charge' | 'discount' }[]
  interest_direction?: 'pay' | 'receive'
}

export interface DocumentUpdate {
  notes?: string
  date?: string
  due_date?: string
  payment_terms?: string
  attachment_urls?: string[]
  charges?: Charge[]
  taxes?: Tax[]
  discount?: number
  total_amount?: string | number
  consignee?: number
  reference?: number
  line_items?: LineItem[]
}

export interface RecordPaymentPayload {
  amount: string
  payment_account: number
  date?: string
  notes?: string
  interest_lines?: InterestLine[]
}

export interface MoveStockPayload {
  items: { product_id: number; quantity: number }[]
  date?: string
}

export interface StockPreviewItem {
  product_id: number
  product_name: string
  record_qty: string
  moved_qty: string
  remaining_qty: string
}

// Payload for Standalone Interest Action (Path C)
export interface StandaloneInterestPayload {
  contact?: number
  date?: string
  line_items: { name: string; amount: number }[] // Path C schema uses generic line_items
  toggle: 'charge' | 'credit'
}

// Result from GET /documents/{id}/reference_data/
export interface ReferenceData {
  line_items: LineItem[]
  charges: Charge[]
  taxes: Tax[]
  consignee: number | null
  discount: string
  payment_terms: string | null
  notes: string | null
}

// Payload for POST /documents/{id}/add_details/
export interface AddDetailsPayload {
  line_items: LineItem[]
}

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  bill:                  'Bill',
  invoice:               'Invoice',
  po:                    'Purchase Order',
  pi:                    'Proforma Invoice',
  quotation:             'Quotation',
  challan:               'Challan',
  cn:                    'Credit Note',
  dn:                    'Debit Note',
  cash_payment_voucher:  'Cash Payment Voucher',
  cash_receipt_voucher:  'Cash Receipt Voucher',
  interest:              'Interest',
  expense:               'Expense',
}

export const NO_FTXN_DOC_TYPES: DocumentType[] = [
  'po', 'pi', 'quotation', 'challan',
  'interest', 'expense',
  'cash_payment_voucher', 'cash_receipt_voucher',
]

export const NO_STXN_DOC_TYPES: DocumentType[] = [
  'po', 'pi', 'quotation',
  'interest', 'expense',
  'cash_payment_voucher', 'cash_receipt_voucher',
]

export const HAS_PAYMENT_STATUS: DocumentType[] = [
  'bill', 'invoice', 'cn', 'dn',
]

export const HAS_STOCK_STATUS: DocumentType[] = [
  'bill', 'invoice', 'cn', 'dn', 'challan',
]

export interface ContactDisplay {
  name:       string
  phone?:     string | null
  gstin?:     string | null
  address?:   string | null
  all_phones?: Array<{ name: string; number: string; role: string }>
}

export interface ConsigneeDisplay {
  name:     string
  phone?:   string | null
  address?: string | null
}
