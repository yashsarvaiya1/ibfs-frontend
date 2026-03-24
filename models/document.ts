// models/document.ts
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
  name:        string
  hsn?:        string | null
  quantity?:   number
  rate?:       number
  amount?:     number
  product_id?: number | null
}

export interface Charge {
  name:   string
  amount: number
}

export interface Tax {
  name:       string
  percentage: number
}

export interface InterestLine {
  name:   string
  amount: number
  type:   'charge' | 'discount'
}

export interface PaymentStatusDetail {
  record:    string
  paid:      string
  remaining: string
  is_paid:   boolean
}

export interface PaymentStatusSummary {
  remaining: string
  is_paid:   boolean
}

export interface StockStatusItem {
  product_id:    number
  product_name:  string
  record_qty:    string
  moved_qty:     string
  remaining_qty: string
  is_moved:      boolean
}

export interface Document {
  id:                   number
  type:                 DocumentType
  doc_id:               string
  contact:              number | null
  consignee:            number | null
  reference:            number | null
  line_items:           LineItem[]
  total_amount:         string | null
  discount:             string
  charges:              Charge[]
  taxes:                Tax[]
  date:                 string
  due_date:             string | null
  payment_terms:        string | null
  attachment_urls:      string[]
  attachment_urls_full: string[]
  notes:                string | null
  is_active:            boolean
  is_paid:              boolean
  created_at:           string
  updated_at:           string
  transactions?:        FinancialTransaction[]
  payment_status:       PaymentStatusDetail | null
  stock_status:         StockStatusItem[] | null
  contact_display?:     ContactDisplay | null
  consignee_display?:   ConsigneeDisplay | null
}

export interface DocumentListItem {
  id:             number
  type:           DocumentType
  doc_id:         string
  contact:        number | null
  contact_name:   string | null
  date:           string
  total_amount:   string | null
  is_active:      boolean
  is_paid:        boolean
  payment_status: PaymentStatusSummary | null
}

export interface DocumentCreate {
  type:             DocumentType
  doc_id?:          string         // DI-01: optional custom doc_id on create
  contact?:         number
  consignee?:       number
  reference?:       number
  line_items?:      LineItem[]
  total_amount?:    string | number
  discount?:        number
  charges?:         Charge[]
  taxes?:           Tax[]
  date:             string
  due_date?:        string
  payment_terms?:   string
  attachment_urls?: string[]
  notes?:           string
  payment_account?: number
  interest_lines?:  { name: string; amount: number; type: 'charge' | 'discount' }[]
  toggle?:          'charge' | 'credit'
}

export interface DocumentUpdate {
  doc_id?:          string         // DI-01: editable — backend returns 409 if duplicate
  contact?:         number | null
  notes?:           string
  date?:            string
  due_date?:        string
  payment_terms?:   string
  attachment_urls?: string[]
  charges?:         Charge[]
  taxes?:           Tax[]
  discount?:        number
  total_amount?:    string | number
  consignee?:       number | null
  reference?:       number | null
  line_items?:      LineItem[]
}

/**
 * DI-01: Backend returns HTTP 409 when doc_id already exists on another document.
 * Shape: { error: string, conflict: true }
 */
export interface DocIdConflictError {
  error:    string
  conflict: true
}

export interface RecordPaymentPayload {
  amount:           string
  payment_account:  number
  date?:            string
  notes?:           string
  interest_lines?:  InterestLine[]
}

export interface MarkPaidPayload {
  is_paid: boolean
}

export interface MoveStockPayload {
  items: { product_id: number; quantity: number }[]
  date?: string
}

export interface StockPreviewItem {
  product_id:    number
  product_name:  string
  record_qty:    string
  moved_qty:     string
  remaining_qty: string
}

export interface StandaloneInterestPayload {
  contact?:    number
  reference?:  number
  date?:       string
  line_items:  { name: string; amount: number }[]
  toggle:      'charge' | 'credit'
}

export interface ReferenceData {
  line_items:    LineItem[]
  charges:       Charge[]
  taxes:         Tax[]
  consignee:     number | null
  discount:      string
  payment_terms: string | null
  notes:         string | null
}

export interface AddDetailsPayload {
  line_items: LineItem[]
}

/**
 * DV-04 / DV-05: Bulk print payload.
 * ids present  → merge PDF for exactly those document PKs.
 * ids absent   → merge PDF for the current filtered queryset on the backend.
 */
export interface BulkPrintPayload {
  ids?: number[]
}

// ── Document list / filter params ─────────────────────────────────────────────
export interface DocumentListParams {
  type?:      DocumentType
  contact?:   number         // DV-03
  date_from?: string
  date_to?:   string
  reference?: number
  is_paid?:   boolean        // BF-08: only pass true|false — never empty string
  page?:      number
  page_size?: number         // GD-03: 20 | 50 | 100
  search?:    string
  ordering?:  string
}

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  bill:                 'Bill',
  invoice:              'Invoice',
  po:                   'Purchase Order',
  pi:                   'Proforma Invoice',
  quotation:            'Quotation',
  challan:              'Challan',
  cn:                   'Credit Note',
  dn:                   'Debit Note',
  cash_payment_voucher: 'Cash Payment Voucher',
  cash_receipt_voucher: 'Cash Receipt Voucher',
  interest:             'Interest',
  expense:              'Expense',
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

export const MARK_PAID_TYPES: DocumentType[] = [
  'bill', 'invoice', 'cn', 'dn',
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
