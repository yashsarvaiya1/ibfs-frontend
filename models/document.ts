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
  bill: 'Bill',
  invoice: 'Invoice',
  po: 'Purchase Order',
  pi: 'Proforma Invoice',
  challan: 'Challan',
  quotation: 'Quotation',
  cn: 'Credit Note',
  dn: 'Debit Note',
  cash_voucher: 'Cash Voucher',
  income_voucher: 'Income Voucher',
  interest: 'Interest',
}

// Types that auto-create a record transaction on backend
export const RECORD_CREATING_TYPES: DocumentType[] = [
  'bill', 'invoice', 'cn', 'dn', 'cash_voucher', 'income_voucher',
]

// Types that affect stock (only if product_id in line items)
export const STOCK_AFFECTING_TYPES: DocumentType[] = [
  'bill', 'invoice', 'cn', 'dn',
]

// Types that never create any financial transaction
export const NON_FINANCIAL_TYPES: DocumentType[] = [
  'po', 'pi', 'quotation', 'challan',
]
