// models/document.ts

export type DocumentType =
  | 'bill'
  | 'invoice'
  | 'po'
  | 'pi'
  | 'challan'
  | 'quotation'
  | 'cn'
  | 'dn'
  | 'cash_voucher'
  | 'income_voucher'
  | 'interest'

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
  document_type: DocumentType
  document_number: string | null
  contact: number | null
  consignee: number | null
  line_items: LineItem[]
  discount: string
  charges: Charge[]
  taxes: Tax[]
  document_date: string | null
  due_date: string | null
  payment_terms: string | null
  reference: number | null
  header_image_url: string | null
  signature_image_url: string | null
  attachment_urls: string[]
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DocumentFormData {
  document_type: DocumentType
  document_number?: string
  contact?: number | null
  consignee?: number | null
  line_items?: LineItem[]
  discount?: string
  charges?: Charge[]
  taxes?: Tax[]
  document_date?: string
  due_date?: string
  payment_terms?: string
  reference?: number | null
  header_image_url?: string
  signature_image_url?: string
  attachment_urls?: string[]
  notes?: string
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  bill:           'Bill',
  invoice:        'Invoice',
  po:             'Purchase Order',
  pi:             'Proforma Invoice',
  challan:        'Challan',
  quotation:      'Quotation',
  cn:             'Credit Note',
  dn:             'Debit Note',
  cash_voucher:   'Cash Voucher',
  income_voucher: 'Income Voucher',
  interest:       'Interest',
}

// Types that auto-create a record transaction on backend
export const RECORD_CREATING_TYPES: DocumentType[] = [
  'bill', 'invoice', 'cn', 'dn', 'cash_voucher', 'income_voucher', 'interest',
]

// Types that affect stock (only if product_id in line items)
export const STOCK_AFFECTING_TYPES: DocumentType[] = [
  'bill', 'invoice', 'cn', 'dn',
]

// Types that never create any financial transaction
export const NON_FINANCIAL_TYPES: DocumentType[] = [
  'po', 'pi', 'quotation', 'challan',
]

// Types where rate/amount column is shown in line items
export const RATE_SHOWING_TYPES: DocumentType[] = [
  'bill', 'invoice', 'po', 'pi', 'quotation',
  'cn', 'dn', 'cash_voucher', 'income_voucher', 'interest',
]

// Payment sign convention per document type
// Positive = money IN to us | Negative = money OUT from us
export const PAYMENT_SIGN: Partial<Record<DocumentType, 1 | -1>> = {
  bill:           -1,  // we pay out
  invoice:         1,  // we receive
  cn:              1,  // we receive refund
  dn:             -1,  // we send refund
  cash_voucher:   -1,  // expense out
  income_voucher:  1,  // income in
  interest:        1,  // we receive interest (default, user can toggle)
}

// Calculate document grand total from line items + charges + taxes - discount
export const calculateDocumentTotal = (doc: Pick<Document, 'line_items' | 'charges' | 'taxes' | 'discount'>): number => {
  const subtotal = (doc.line_items || []).reduce(
    (sum, item) => sum + (item.amount ?? 0), 0
  )
  const totalCharges = (doc.charges || []).reduce(
    (sum, c) => sum + (c.amount ?? 0), 0
  )
  const totalTax = (doc.taxes || []).reduce(
    (sum, t) => sum + (subtotal * (t.percentage ?? 0)) / 100, 0
  )
  const discount = parseFloat(doc.discount || '0')
  return subtotal + totalCharges + totalTax - discount
}
