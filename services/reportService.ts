import api from '@/lib/axios'
import type { DocumentType } from '@/models/document'

export interface ReportPeriod { date_from: string; date_to: string }
export interface CADocument { id: number; doc_id: string; type: DocumentType; date: string; contact_name: string | null; total_amount: string | null }
export interface CADocumentPage { count: number; as_of: string; results: CADocument[] }
export type GSTBucket = 'output' | 'purchase' | 'rcm_output' | 'rcm_purchase' | 'review'
export interface GSTAmounts { taxable_amount: string; cgst: string; sgst: string; igst: string; utgst: string; cess: string; unsplit_gst: string; other_tax: string; gst_total: string }
export interface GSTRow { id: number; doc_id: string; type: DocumentType; date: string; contact: string; gstin: string | null; bucket: GSTBucket; total_amount: string | null; taxable_amount: string | null; amounts: GSTAmounts; issues: string[] }
export interface GSTReport { count: number; review_count: number; basis: string; page_size: number; totals: Record<GSTBucket, GSTAmounts>; difference: GSTAmounts; months: { month: string; totals: Record<GSTBucket, GSTAmounts> }[]; results: GSTRow[] }

export interface HSNRow extends GSTAmounts { bucket: GSTBucket; hsn: string; unit: string; rate: string; supply_category: string | null; quantity: string | null; document_count: number; issues: string[] }
export interface HSNReport { basis: string; results: HSNRow[]; excluded: { id: number; doc_id: string; issues: string[] }[] }
export interface AllocationReview { count: number; page_size: number; results: { id: number; date: string; contact: string; account: string; amount: string; unallocated: string; document_id: number | null; doc_id: string | null; issue: string }[] }

export interface ComparisonResult { basis: string; results: { row: number; date: string; number: string; status: string; detail: string; amount: string; matches: { id: number; kind: 'document' | 'transaction'; label: string }[] }[]; unmatched_books: { id: number; kind: 'document' | 'transaction'; label: string; date: string; amount: string }[] }

export interface FYAmounts { net_sales: string; net_purchases: string; expenses: string; cash_received: string; cash_paid: string; sales: string; sales_returns: string; purchases: string; purchase_returns: string }
export interface FYReport { fy: number; date_from: string; date_to: string; basis: string; totals: FYAmounts; known_pre_tax: FYAmounts; document_counts: Record<string, number>; review: { id: number; doc_id: string; reason: string }[]; months: (FYAmounts & { month: string })[] }
export const reportService = {
  financialYear: (fy: number) => api.get<FYReport>('/reports/financial_year/', { params: { fy } }).then(r => r.data),
  financialYearExport: (fy: number, export_format: 'pdf' | 'csv') => api.get<Blob>('/reports/financial_year_export/', { params: { fy, export_format }, responseType: 'blob' }).then(r => r.data),
  caDocuments: (params: ReportPeriod & { types?: string; as_of?: string; page?: number }) =>
    api.get<CADocumentPage>('/reports/ca_documents/', { params }).then(r => r.data),
  caExport: (data: ReportPeriod & { types?: DocumentType[]; as_of: string; expected_count: number; ids?: number[]; excluded_ids?: number[] }) =>
    api.post<Blob>('/reports/ca_export/', data, { responseType: 'blob' }).then(r => r.data),
  comparisonTemplate: (kind: 'bank' | 'purchase') => api.get<Blob>('/reports/comparison_template/', { params: { kind }, responseType: 'blob' }).then(r => r.data),
  compareCSV: (data: FormData) => api.post<ComparisonResult>('/reports/compare_csv/', data, { headers: { 'Content-Type': undefined } }).then(r => r.data),
  gstExport: (params: ReportPeriod & { export_format: 'pdf' | 'csv'; review_only?: boolean }) => api.get<Blob>('/reports/gst_export/', { params, responseType: 'blob' }).then(r => r.data),
  hsn: (params: ReportPeriod) => api.get<HSNReport>('/reports/hsn/', { params }).then(r => r.data),
  hsnExport: (params: ReportPeriod & { export_format: 'pdf' | 'csv' }) => api.get<Blob>('/reports/hsn_export/', { params, responseType: 'blob' }).then(r => r.data),
  allocationReview: (params: ReportPeriod & { page?: number }) => api.get<AllocationReview>('/reports/allocation_review/', { params }).then(r => r.data),
  gst: (params: ReportPeriod & { page?: number; review_only?: boolean }) => api.get<GSTReport>('/reports/gst/', { params }).then(r => r.data),
}
