// models/document.ts

export type DocumentType =
  | 'bill' | 'invoice'
  | 'po' | 'pi' | 'quotation'
  | 'challan' | 'cn' | 'dn'
  | 'cash_payment_voucher' | 'cash_receipt_voucher'
  | 'interest' | 'expense'

export type StockStatus = 'na' | 'pending' | 'partial' | 'done'

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

export interface Document {
  id: number
  type: DocumentType
  doc_id: string
  contact: number | null
  contact_name: string | null     // denormalized from backend
  consignee: number | null
  reference: number | null
  reference_doc_id: string | null // denormalized from backend
  line_items: LineItem[]
  total_amount: string | null
  discount: string
  charges: Charge[]
  taxes: Tax[]
  date: string
  due_date: string | null
  payment_terms: string | null
  attachment_urls: string[]
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // nested (detail view only)
  transactions?: import('./transaction').FinancialTransaction[]
}

export interface DocumentListItem {
  id: number
  type: DocumentType
  doc_id: string
  contact: number | null
  contact_name: string | null     // fix for bug #18
  date: string
  total_amount: string | null
  is_active: boolean
  stock_status: StockStatus       // fix for bug #13
}

export type DocumentCreate = {
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
  payment_account?: number        // for auto_transaction
}

export interface InterestLine {
  name: string
  amount: number
  type: 'charge' | 'discount'
}

export interface RecordPaymentPayload {
  amount: string
  payment_account: number
  date?: string
  notes?: string
  interest_lines?: InterestLine[] // fix: was missing
}

export interface MoveStockPayload {
  items: { product_id: number; quantity: number }[]
  date?: string
}

export interface StockPreviewItem {
  product_id: number
  product_name: string
  unit: string                    // fix: was missing
  record_qty: string
  moved_qty: string
  remaining_qty: string
  is_complete: boolean            // fix: was missing
}

export type DeleteStrategy = 'revert' | 'manual' | 'orphan'

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  bill: 'Bill',
  invoice: 'Invoice',
  po: 'Purchase Order',
  pi: 'Proforma Invoice',
  quotation: 'Quotation',
  challan: 'Challan',
  cn: 'Credit Note',
  dn: 'Debit Note',
  cash_payment_voucher: 'Cash Payment Voucher',
  cash_receipt_voucher: 'Cash Receipt Voucher',
  interest: 'Interest',
  expense: 'Expense',
}

// Document types that never have f.txns — used for UI guards (bug #10)
export const NO_FTXN_DOC_TYPES: DocumentType[] = [
  'challan', 'quotation', 'po', 'pi', 'expense', 'interest',
]

// Document types that never have s.txns — used for UI guards
export const NO_STXN_DOC_TYPES: DocumentType[] = [
  'quotation', 'po', 'pi',
  'expense', 'interest',
  'cash_payment_voucher', 'cash_receipt_voucher',
]
