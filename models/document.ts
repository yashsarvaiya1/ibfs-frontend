// models/document.ts

export type DocumentType =
  | 'bill' | 'invoice'
  | 'po' | 'pi' | 'quotation'
  | 'challan' | 'cn' | 'dn'
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
  date: string
  total_amount: string | null
  is_active: boolean
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
  payment_account?: number       // for auto_transaction
}

export interface RecordPaymentPayload {
  amount: string
  payment_account: number
  date?: string
  notes?: string
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
