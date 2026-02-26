// models/document.ts
import type { FinancialTransaction } from './transaction'

export type DeleteStrategy = 'revert' | 'manual' | 'orphan'

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

// ── Line item / sub-types ──────────────────────────────────────────────────

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

// ── Payment status — returned by backend as computed field ─────────────────
// DocumentSerializer.get_payment_status → { record, paid, remaining, is_paid }
// DocumentListSerializer.get_payment_status → { remaining, is_paid }

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

// ── Stock status — returned by backend as computed field array ─────────────
// DocumentSerializer.get_stock_status → StockStatusItem[] | null

export interface StockStatusItem {
  product_id: number
  product_name: string
  record_qty: string
  moved_qty: string
  remaining_qty: string
  is_moved: boolean
}

// ── Document (detail — from DocumentSerializer) ────────────────────────────

export interface Document {
  id: number
  type: DocumentType
  doc_id: string
  contact: number | null
  consignee: number | null
  reference: number | null           // FK id only — resolve display name from store
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
  // nested — present in detail, absent in list
  transactions?: FinancialTransaction[]
  // computed — present in detail
  payment_status: PaymentStatusDetail | null
  stock_status: StockStatusItem[] | null
}

// ── DocumentListItem (from DocumentListSerializer) ─────────────────────────

export interface DocumentListItem {
  id: number
  type: DocumentType
  doc_id: string
  contact: number | null
  contact_name: string | null        // denormalized in DocumentListSerializer
  date: string
  total_amount: string | null
  is_active: boolean
  is_paid: boolean 
  payment_status: PaymentStatusSummary | null  // computed — matches backend exactly
}

// ── Create / update payloads ───────────────────────────────────────────────

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
  // Only sent when auto_transaction = ON
  payment_account?: number
}

// Safe fields allowed on document PATCH (matches views.py DocumentViewSet.update)
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
  line_items?: LineItem[]   // triggers _sync_record_stxns on backend
}

// ── Action payloads ────────────────────────────────────────────────────────

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

export interface DeleteDocumentPayload {
  strategy: 'revert' | 'manual' | 'orphan'
}

// ── Stock preview (from stock_preview action) ──────────────────────────────
// Matches exactly: accounting/views.py DocumentViewSet.stock_preview response

export interface StockPreviewItem {
  product_id: number
  product_name: string
  record_qty: string
  moved_qty: string
  remaining_qty: string
}

// ── UI helpers ─────────────────────────────────────────────────────────────

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

// Doc types that generate zero f.txns — record_payment action blocked on backend
export const NO_FTXN_DOC_TYPES: DocumentType[] = [
  'po', 'pi', 'quotation', 'challan',
  'interest', 'expense',
  // cash vouchers DO have an actual f.txn but it's auto-created — no manual recording
  'cash_payment_voucher', 'cash_receipt_voucher',
]

// Doc types that generate zero s.txns — move_stock action blocked on backend
export const NO_STXN_DOC_TYPES: DocumentType[] = [
  'po', 'pi', 'quotation',
  'interest', 'expense',
  'cash_payment_voucher', 'cash_receipt_voucher',
]

// Doc types where payment_status is meaningful to show in UI
export const HAS_PAYMENT_STATUS: DocumentType[] = [
  'bill', 'invoice', 'cn', 'dn',
]

// Doc types where stock_status panel should be shown
export const HAS_STOCK_STATUS: DocumentType[] = [
  'bill', 'invoice', 'cn', 'dn', 'challan',
]
