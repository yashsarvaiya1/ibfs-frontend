import api from '@/lib/axios'
import type { DocumentType } from '@/models/document'

export interface ReportPeriod { date_from: string; date_to: string }
export interface CADocument { id: number; doc_id: string; type: DocumentType; date: string; contact_name: string | null; total_amount: string | null }
export interface CADocumentPage { count: number; as_of: string; results: CADocument[] }
export type GSTBucket = 'output' | 'purchase' | 'rcm_output' | 'rcm_purchase' | 'review'
export interface GSTAmounts { taxable_amount: string; cgst: string; sgst: string; igst: string; utgst: string; cess: string; unsplit_gst: string; other_tax: string; gst_total: string }
export interface GSTRow { id: number; doc_id: string; type: DocumentType; date: string; contact: string; gstin: string | null; bucket: GSTBucket; total_amount: string | null; taxable_amount: string | null; amounts: GSTAmounts; issues: string[] }
export interface GSTReport { count: number; review_count: number; basis: string; page_size: number; totals: Record<GSTBucket, GSTAmounts>; difference: GSTAmounts; months: { month: string; totals: Record<GSTBucket, GSTAmounts> }[]; results: GSTRow[] }

export const reportService = {
  caDocuments: (params: ReportPeriod & { types?: string; as_of?: string; page?: number }) =>
    api.get<CADocumentPage>('/reports/ca_documents/', { params }).then(r => r.data),
  caExport: (data: ReportPeriod & { types?: DocumentType[]; as_of: string; expected_count: number; ids?: number[]; excluded_ids?: number[] }) =>
    api.post<Blob>('/reports/ca_export/', data, { responseType: 'blob' }).then(r => r.data),
  gst: (params: ReportPeriod & { page?: number; review_only?: boolean }) => api.get<GSTReport>('/reports/gst/', { params }).then(r => r.data),
}
