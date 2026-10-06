'use client'

import { FinancialYearReport } from './FinancialYearReport'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useUIStore } from '@/stores/uiStore'
import { businessDate } from '@/lib/businessDate'
import { currentFinancialYear, financialYearPeriod, monthPeriod } from '@/lib/reportPeriod'
import { reportService, type ReportPeriod, type GSTAmounts, type GSTBucket, type ComparisonResult } from '@/services/reportService'
import { useAccounts } from '@/hooks/useAccount'
import { SearchableSelect } from '@/components/shared/common/SearchableSelect'
import { DOC_TYPE_LABELS, type DocumentType } from '@/models/document'
import { downloadBlob } from '@/lib/download'
import { apiError } from '@/lib/apiError'
import { fmtAmount, fmtDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Download, FileText, Calculator, Loader2, RefreshCw, ExternalLink } from 'lucide-react'
import { SaveOfflineButton } from '@/components/offline/SaveOfflineButton'
import { toast } from 'sonner'

type Mode = 'ca' | 'fy' | 'gst' | 'hsn' | 'review' | 'compare'
const selectClass = 'h-10 w-full rounded-md border bg-background px-3 text-sm'
const bucketLabels: Record<GSTBucket, string> = { output: 'Sales GST', purchase: 'Purchase GST', rcm_output: 'Reverse-charge sales', rcm_purchase: 'Reverse-charge purchases', review: 'Excluded pending review' }

export function ReportsPage() {
  const [mode, setMode] = useState<Mode>('ca')
  const setTitle = useUIStore(s => s.setPageTitle)
  useEffect(() => { setTitle('Reports & CA exports') }, [setTitle])
  return <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
    <div><h1 className="text-2xl font-bold">Reports & CA exports</h1><p className="text-sm text-muted-foreground mt-1">Prepare your documents for the CA and review GST recorded in your books.</p></div>
    <div className="flex gap-2 flex-wrap" aria-label="Report type"><Button aria-pressed={mode === 'ca'} variant={mode === 'ca' ? 'default' : 'outline'} onClick={() => setMode('ca')}><FileText className="mr-2 h-4 w-4" />CA document PDF</Button><Button aria-pressed={mode === 'fy'} variant={mode === 'fy' ? 'default' : 'outline'} onClick={() => setMode('fy')}>FY business report</Button><Button aria-pressed={mode === 'gst'} variant={mode === 'gst' ? 'default' : 'outline'} onClick={() => setMode('gst')}><Calculator className="mr-2 h-4 w-4" />GST report</Button><Button aria-pressed={mode === 'hsn'} variant={mode === 'hsn' ? 'default' : 'outline'} onClick={() => setMode('hsn')}>HSN/SAC</Button><Button aria-pressed={mode === 'review'} variant={mode === 'review' ? 'default' : 'outline'} onClick={() => setMode('review')}>Payment review</Button><Button aria-pressed={mode === 'compare'} variant={mode === 'compare' ? 'default' : 'outline'} onClick={() => setMode('compare')}>Compare CSV</Button></div>
    {mode === 'fy' ? <FinancialYearReport /> : <ReportContent key={mode} mode={mode} />}
  </div>
}

function ReportContent({ mode }: { mode: Mode }) {
  const fy = currentFinancialYear()
  const [preset, setPreset] = useState(mode === 'ca' || mode === 'gst' ? 'month' : 'fy')
  const [month, setMonth] = useState(businessDate().slice(0, 7))
  const [year, setYear] = useState(fy)
  const [draft, setDraft] = useState<ReportPeriod>(() => mode === 'ca' || mode === 'gst' ? monthPeriod(businessDate().slice(0, 7)) : financialYearPeriod(fy))
  const [period, setPeriod] = useState(draft)
  const [draftType, setDraftType] = useState('')
  const [type, setType] = useState('')
  const [periodError, setPeriodError] = useState('')
  return <>
    <Card><CardContent className="pt-5"><form className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end" onSubmit={e => { e.preventDefault(); if (!draft.date_from || !draft.date_to || draft.date_from > draft.date_to) { setPeriodError('Choose a valid start and end date.'); return } setPeriodError(''); setPeriod(draft); setType(draftType) }}>
      <div className="space-y-1.5"><Label htmlFor="report-period">Period</Label><select id="report-period" className={selectClass} value={preset} onChange={e => { const next = e.target.value; setPreset(next); if (next === 'month') setDraft(monthPeriod(month)); if (next === 'fy') setDraft(financialYearPeriod(year)) }}><option value="month">Month</option><option value="fy">Financial year (Apr–Mar)</option><option value="custom">Custom date range</option></select></div>
      {preset === 'month' && <div className="space-y-1.5"><Label htmlFor="report-month">Month</Label><Input id="report-month" type="month" value={month} required onChange={e => { setMonth(e.target.value); if (e.target.value) setDraft(monthPeriod(e.target.value)) }} /></div>}
      {preset === 'fy' && <div className="space-y-1.5"><Label htmlFor="report-fy">Financial year</Label><select id="report-fy" className={selectClass} value={year} onChange={e => { const y = Number(e.target.value); setYear(y); setDraft(financialYearPeriod(y)) }}>{Array.from({ length: 8 }, (_, i) => fy - i).map(y => <option key={y} value={y}>{y}–{String(y + 1).slice(2)}</option>)}</select></div>}
      <div className="space-y-1.5"><Label htmlFor="report-from">From</Label><Input id="report-from" type="date" required value={draft.date_from} onChange={e => { setPreset('custom'); setDraft({ ...draft, date_from: e.target.value }) }} /></div>
      <div className="space-y-1.5"><Label htmlFor="report-to">To</Label><Input id="report-to" type="date" required value={draft.date_to} onChange={e => { setPreset('custom'); setDraft({ ...draft, date_to: e.target.value }) }} /></div>
      {mode === 'ca' && <div className="space-y-1.5"><Label htmlFor="report-doc-type">Documents</Label><select id="report-doc-type" className={selectClass} value={draftType} onChange={e => setDraftType(e.target.value)}><option value="">All document types</option>{Object.entries(DOC_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>}
      <Button type="submit">Show {mode === 'ca' ? 'documents' : 'report'}</Button>
      {periodError && <p role="alert" className="text-sm text-destructive sm:col-span-2">{periodError}</p>}
    </form></CardContent></Card>
    <p className="text-sm text-muted-foreground">Showing {fmtDate(period.date_from)} – {fmtDate(period.date_to)}</p>
    {mode === 'ca' ? <CAReport key={`${period.date_from}-${period.date_to}-${type}`} period={period} type={type} /> : mode === 'gst' ? <GSTReportView key={`${period.date_from}-${period.date_to}`} period={period} /> : mode === 'hsn' ? <HSNReportView key={`${period.date_from}-${period.date_to}`} period={period} /> : mode === 'review' ? <PaymentReviewView key={`${period.date_from}-${period.date_to}`} period={period} /> : <CompareCSVView key={`${period.date_from}-${period.date_to}`} period={period} />}
  </>
}

function PageButtons({ page, count, size, onPage, busy }: { page: number; count: number; size: number; onPage: (page: number) => void; busy: boolean }) {
  if (count <= size) return null
  return <div className="flex items-center justify-between gap-3 pt-3"><Button variant="outline" size="sm" disabled={page === 1 || busy} onClick={() => onPage(page - 1)}>Previous</Button><p className="text-xs text-muted-foreground">Page {page} of {Math.ceil(count / size)}</p><Button variant="outline" size="sm" disabled={page * size >= count || busy} onClick={() => onPage(page + 1)}>Next</Button></div>
}

function CAReport({ period, type }: { period: ReportPeriod; type: string }) {
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [all, setAll] = useState(true)
  const [selection, setSelection] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const initial = useQuery({ queryKey: ['ca-documents', period, type, revision], queryFn: () => reportService.caDocuments({ ...period, types: type || undefined }), staleTime: 0, refetchOnWindowFocus: false, refetchOnReconnect: false })
  const otherPage = useQuery({ queryKey: ['ca-documents-page', period, type, initial.data?.as_of, page], queryFn: () => reportService.caDocuments({ ...period, types: type || undefined, as_of: initial.data!.as_of, page }), enabled: !!initial.data && page > 1, staleTime: Infinity, refetchOnWindowFocus: false })
  const query = page === 1 ? initial : otherPage
  const rows = query.data?.results ?? []
  const count = initial.data?.count ?? 0
  const selected = all ? count - selection.size : selection.size
  const isSelected = (id: number) => all ? !selection.has(id) : selection.has(id)
  function toggle(id: number) { setSelection(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  function refresh() { setPage(1); setAll(true); setSelection(new Set()); setRevision(v => v + 1) }
  async function exportPDF() {
    if (!initial.data || !selected || busy) return
    setBusy(true)
    try {
      const blob = await reportService.caExport({ ...period, types: type ? [type as DocumentType] : undefined, as_of: initial.data.as_of, expected_count: selected, ...(all ? { excluded_ids: [...selection] } : { ids: [...selection] }) })
      downloadBlob(blob, `CA_Documents_${period.date_from}_${period.date_to}.pdf`)
      toast.success(`CA PDF generated with ${selected} document${selected === 1 ? '' : 's'}`)
    } catch (error) {
      const response = (error as { response?: { data?: unknown } }).response
      if (response?.data instanceof Blob) {
        try { const data = JSON.parse(await response.data.text()); toast.error(apiError({ response: { data } }, 'Could not generate the CA PDF.')) }
        catch { toast.error('Could not generate the CA PDF. Try again.') }
      } else toast.error(apiError(error, 'Could not generate the CA PDF.'))
    } finally { setBusy(false) }
  }
  return <div className="space-y-4">
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-3 flex flex-wrap justify-between gap-3 items-center"><div><h2 className="font-semibold">{selected} of {count} documents selected</h2><p className="text-sm text-muted-foreground">One PDF, oldest first. Uncheck any documents you don’t want to include.</p></div><Button onClick={exportPDF} disabled={!selected || busy || initial.isFetching || query.isFetching}>{busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}{busy ? 'Generating PDF…' : 'Download CA PDF'}</Button></div>
    <SaveOfflineButton disabled={!selected || busy || initial.isFetching || query.isFetching} load={() => { if (!initial.data) throw new Error('Refresh documents first.'); return reportService.caExport({ ...period, types: type ? [type as DocumentType] : undefined, as_of: initial.data.as_of, expected_count: selected, ...(all ? { excluded_ids: [...selection] } : { ids: [...selection] }) }) }} title={`CA documents ${period.date_from} to ${period.date_to}`} filename={`CA_Documents_${period.date_from}_${period.date_to}.pdf`} />
    <div className="flex gap-2 flex-wrap"><Button variant="outline" size="sm" disabled={busy} onClick={() => { setAll(true); setSelection(new Set()) }}>Select all {count}</Button><Button variant="outline" size="sm" disabled={busy} onClick={() => { setAll(false); setSelection(new Set()) }}>Clear selection</Button><Button variant="ghost" size="sm" disabled={busy || query.isFetching} onClick={refresh}><RefreshCw className="h-4 w-4 mr-2" />Refresh list</Button></div>
    {query.isPending ? <p className="text-sm text-muted-foreground" role="status">Loading documents…</p> : query.isError ? <div role="alert" className="text-sm text-destructive">{apiError(query.error, 'Could not load documents.')} <Button variant="outline" size="sm" onClick={() => query.refetch()}>Retry</Button></div> : !rows.length ? <p className="rounded-xl border p-5 text-sm text-muted-foreground">No documents in this period.</p> : <div className="rounded-xl border divide-y">
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 rounded-t-xl"><Checkbox aria-label="Select this page" disabled={busy} checked={rows.every(row => isSelected(row.id)) ? true : rows.some(row => isSelected(row.id)) ? 'indeterminate' : false} onCheckedChange={checked => setSelection(current => { const next = new Set(current); for (const row of rows) { if (Boolean(checked) === all) next.delete(row.id); else next.add(row.id) } return next })} /><span className="text-xs font-medium text-muted-foreground">Documents on this page</span></div>
      {rows.map(doc => <div key={doc.id} className="flex items-center gap-3 p-4"><Checkbox aria-label={`Include ${doc.doc_id}`} checked={isSelected(doc.id)} disabled={busy} onCheckedChange={() => toggle(doc.id)} /><div className="flex-1 min-w-0"><p className="text-sm font-semibold break-words">{DOC_TYPE_LABELS[doc.type]} #{doc.doc_id}</p><p className="text-xs text-muted-foreground break-words mt-1">{fmtDate(doc.date)}{doc.contact_name ? ` · ${doc.contact_name}` : ''}</p></div><div className="text-right shrink-0"><p className="text-sm font-medium">{doc.type !== 'challan' && doc.total_amount !== null ? fmtAmount(doc.total_amount) : '—'}</p><Link className="inline-flex items-center text-xs text-primary mt-1 gap-1" href={`/documents/${doc.id}/print`} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${doc.doc_id}`}>Preview<ExternalLink className="h-3 w-3" /></Link></div></div>)}
    </div>}
    <PageButtons page={page} count={count} size={50} onPage={setPage} busy={busy || query.isFetching} />
  </div>
}

function GSTReportView({ period }: { period: ReportPeriod }) {
  const [page, setPage] = useState(1)
  const [reviewOnly, setReviewOnly] = useState(false)
  const query = useQuery({ queryKey: ['gst-report', period, page, reviewOnly], queryFn: () => reportService.gst({ ...period, page, review_only: reviewOnly }) })
  const data = query.data
  if (query.isPending) return <p role="status" className="text-sm text-muted-foreground">Calculating GST…</p>
  if (query.isError || !data) return <div role="alert" className="text-sm text-destructive">{apiError(query.error, 'Could not load GST summary.')} <Button variant="outline" onClick={() => query.refetch()}>Retry</Button></div>
  const totals = data.totals
  const components: (keyof GSTAmounts)[] = ['cgst', 'sgst', 'igst', 'utgst', 'cess', 'unsplit_gst', 'other_tax']
  return <div className="space-y-5">
    <ReportDownloads period={period} kind="gst" reviewOnly={reviewOnly} />
    <div className="grid sm:grid-cols-3 gap-3">{[['Sales GST after credit notes', totals.output.gst_total], ['Purchase GST after debit notes', totals.purchase.gst_total], ['Book GST difference', data.difference.gst_total]].map(([label, value]) => <Card key={label}><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold mt-1">{fmtAmount(value)}</p></CardContent></Card>)}</div>
    <div className="rounded-xl border bg-muted/40 p-4 text-sm space-y-2"><p>Purchase GST needs GSTR-2B matching and ITC review. The book GST difference is not tax payable.</p><details><summary className="cursor-pointer font-medium">How this connects to your flow</summary><p className="mt-2">{data.basis}</p><p className="text-muted-foreground">Purchase GST is the tax recorded in bills, before GSTR-2B matching and ITC eligibility review. The difference is a book comparison, not tax payable. Reverse charge and excluded documents are shown separately.</p><p className="text-muted-foreground">Shared document rates remain the default; optional per-item rates support mixed GST. Missing details and unspecified classifications are flagged below. HSN/SAC reports use saved codes and units; no portal validation is performed.</p></details></div>
    <div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm min-w-[720px]"><thead className="bg-muted/40"><tr><th className="text-left p-3">Tax component</th>{(Object.keys(bucketLabels) as GSTBucket[]).map(bucket => <th className="text-right p-3" key={bucket}>{bucketLabels[bucket]}</th>)}</tr></thead><tbody>{components.map(key => <tr key={key} className="border-t"><th className="text-left p-3 font-medium">{key === 'unsplit_gst' ? 'GST without split' : key === 'other_tax' ? 'Other tax (not GST)' : key.toUpperCase()}</th>{(Object.keys(bucketLabels) as GSTBucket[]).map(bucket => <td className="text-right p-3 tabular-nums" key={bucket}>{fmtAmount(totals[bucket][key])}</td>)}</tr>)}</tbody></table></div>
    <div><h2 className="font-semibold mb-3">Monthly GST in this period</h2>{!data.months.length ? <p className="text-sm text-muted-foreground">No GST documents in this period.</p> : <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[680px] text-sm"><thead className="bg-muted/40"><tr>{['Month', 'Sales GST', 'Purchase GST', 'RCM sales', 'RCM purchases', 'Excluded tax'].map(label => <th key={label} className="p-3 text-right first:text-left">{label}</th>)}</tr></thead><tbody>{data.months.map(month => <tr key={month.month} className="border-t"><th className="p-3 text-left font-medium">{month.month}</th>{(Object.keys(bucketLabels) as GSTBucket[]).map(bucket => <td className="p-3 text-right tabular-nums" key={bucket}>{fmtAmount(month.totals[bucket].gst_total)}</td>)}</tr>)}</tbody></table></div>}</div>
    <div><h2 className="font-semibold mb-3">Document breakdown <span className="text-sm text-muted-foreground font-normal">· {data.review_count} need review</span></h2><label className="flex items-center gap-2 text-sm mb-3"><Checkbox checked={reviewOnly} onCheckedChange={checked => { setReviewOnly(checked === true); setPage(1) }} />Show only documents needing review</label>{data.count === 0 && <p className="text-sm text-muted-foreground">{reviewOnly ? 'No documents need review in this period.' : 'No documents in this period.'}</p>}<div className="space-y-2">{data.results.map(row => <Card key={row.id}><CardContent className="pt-4"><div className="flex justify-between gap-3"><div className="min-w-0"><Link href={`/documents/${row.id}`} className="text-sm font-semibold text-primary break-words">{DOC_TYPE_LABELS[row.type]} #{row.doc_id}</Link><p className="text-xs text-muted-foreground mt-1 break-words">{fmtDate(row.date)} · {row.contact || 'No contact'} · {bucketLabels[row.bucket]}</p></div><div className="shrink-0 text-right"><p className="text-sm font-semibold">{row.taxable_amount === null ? 'GST unavailable' : fmtAmount(row.amounts.gst_total)}</p><p className="text-xs text-muted-foreground">GST adjustment</p></div></div>{row.issues.length > 0 && <ul className="text-xs text-amber-700 dark:text-amber-400 mt-3 space-y-1 list-disc pl-4">{row.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}</CardContent></Card>)}</div><PageButtons page={page} count={data.count} size={data.page_size} onPage={setPage} busy={query.isFetching} /></div>
  </div>
}


function ReportDownloads({ period, kind, reviewOnly = false }: { period: ReportPeriod; kind: 'gst' | 'hsn'; reviewOnly?: boolean }) {
  const [busy, setBusy] = useState('')
  async function download(format: 'pdf' | 'csv') {
    setBusy(format)
    try {
      const blob = await (kind === 'gst' ? reportService.gstExport({ ...period, export_format: format, review_only: reviewOnly }) : reportService.hsnExport({ ...period, export_format: format }))
      downloadBlob(blob, `${kind.toUpperCase()}_Book_Report_${period.date_from}_${period.date_to}.${format}`)
    } catch { toast.error('Could not export this report. Try again.') }
    finally { setBusy('') }
  }
  return <div className="flex flex-wrap items-center gap-2"><Button variant="outline" disabled={!!busy} onClick={() => download('pdf')}>{busy === 'pdf' ? 'Generating…' : 'Download report PDF'}</Button><Button variant="outline" disabled={!!busy} onClick={() => download('csv')}>{busy === 'csv' ? 'Generating…' : 'Download register CSV'}</Button><SaveOfflineButton disabled={!!busy} load={() => kind === 'gst' ? reportService.gstExport({ ...period, export_format: 'pdf', review_only: reviewOnly }) : reportService.hsnExport({ ...period, export_format: 'pdf' })} title={`${kind.toUpperCase()} report ${period.date_from} to ${period.date_to}`} filename={`${kind.toUpperCase()}_Book_Report_${period.date_from}_${period.date_to}.pdf`} /><p className="text-xs text-muted-foreground">Full period{reviewOnly ? ' · review documents only' : ''}. CA review formats.</p></div>
}

function HSNReportView({ period }: { period: ReportPeriod }) {
  const [page, setPage] = useState(1)
  const [excludedPage, setExcludedPage] = useState(1)
  const query = useQuery({ queryKey: ['hsn-report', period], queryFn: () => reportService.hsn(period) })
  if (query.isPending) return <p role="status">Preparing HSN/SAC summary…</p>
  if (query.isError || !query.data) return <div role="alert">Could not load the HSN/SAC summary. <Button onClick={() => query.refetch()}>Retry</Button></div>
  const data = query.data
  return <div className="space-y-4"><ReportDownloads period={period} kind="hsn" /><p className="text-sm text-muted-foreground">{data.basis}</p><h2 className="font-semibold">HSN/SAC groups · {data.results.length}</h2>{!data.results.length && <p className="text-sm text-muted-foreground">No calculable item groups in this period.</p>}
    <div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm min-w-[800px]"><thead className="bg-muted/40"><tr>{['HSN/SAC', 'Classification', 'Unit / qty', 'GST %', 'Taxable value', 'GST total', 'Documents'].map(label => <th className="p-3 text-left" key={label}>{label}</th>)}</tr></thead><tbody>{data.results.slice((page - 1) * 50, page * 50).map((row, index) => <tr className="border-t" key={index}><td className="p-3">{row.hsn || 'Missing code'}<p className="text-xs text-muted-foreground">{bucketLabels[row.bucket]}</p></td><td className="p-3">{row.supply_category?.replaceAll('_', ' ') || 'Not specified'}</td><td className="p-3">{row.unit || '—'} / {row.quantity ?? '—'}</td><td className="p-3">{row.rate}%</td><td className="p-3 tabular-nums">{fmtAmount(row.taxable_amount)}</td><td className="p-3 tabular-nums">{fmtAmount(row.gst_total)}{row.issues.length > 0 && <details className="text-xs text-amber-700 dark:text-amber-400 mt-1"><summary className="cursor-pointer">Review details</summary>{row.issues.map(issue => <p key={issue}>{issue}</p>)}</details>}</td><td className="p-3">{row.document_count}</td></tr>)}</tbody></table></div>
    <PageButtons page={page} size={50} count={data.results.length} onPage={setPage} busy={false} />
    {data.excluded.length > 0 && <div className="space-y-2"><h2 className="font-semibold">Excluded documents · {data.excluded.length}</h2>{data.excluded.slice((excludedPage - 1) * 50, excludedPage * 50).map(row => <Card key={row.id}><CardContent className="pt-4"><Link href={`/documents/${row.id}/edit`} className="text-primary text-sm font-semibold">Review {row.doc_id}</Link><p className="text-xs text-muted-foreground mt-1">{row.issues.join(' · ')}</p></CardContent></Card>)}<PageButtons page={excludedPage} size={50} count={data.excluded.length} onPage={setExcludedPage} busy={false} /></div>}
  </div>
}

function PaymentReviewView({ period }: { period: ReportPeriod }) {
  const [page, setPage] = useState(1)
  const query = useQuery({ queryKey: ['allocation-review', period, page], queryFn: () => reportService.allocationReview({ ...period, page }) })
  if (query.isPending) return <p role="status">Reviewing payments…</p>
  if (query.isError || !query.data) return <div role="alert">Could not load payment review. <Button onClick={() => query.refetch()}>Retry</Button></div>
  const data = query.data
  return <div className="space-y-3"><h2 className="font-semibold">{data.count} payments with unallocated or inconsistent cash</h2><p className="text-sm text-muted-foreground">Advance payments can stay unallocated. Open the transaction’s allocation editor when you know which documents it settles. No matches are guessed from amounts.</p>{data.results.map(row => <Card key={row.id}><CardContent className="pt-4 space-y-2"><div className="flex justify-between gap-3"><div><Link href={`/transactions?review_payment=${row.id}`} className="text-primary font-semibold text-sm">Payment #{row.id}</Link><p className="text-xs text-muted-foreground">{fmtDate(row.date)} · {row.contact || 'No contact'} · {row.account || 'No account'}</p></div><div className="text-right"><p className="text-sm font-semibold">{fmtAmount(row.unallocated)}</p><p className="text-xs text-muted-foreground">Unallocated</p></div></div><p className="text-xs text-muted-foreground">{row.issue}</p>{row.document_id && <Link href={`/documents/${row.document_id}`} className="text-xs text-primary">Open {row.doc_id}</Link>}</CardContent></Card>)}<PageButtons page={page} size={data.page_size} count={data.count} onPage={setPage} busy={query.isFetching} /></div>
}


function CompareCSVView({ period }: { period: ReportPeriod }) {
  const [kind, setKind] = useState<'bank' | 'purchase'>('bank')
  const [account, setAccount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(1)
  const [bookPage, setBookPage] = useState(1)
  const accounts = useAccounts({ is_active: true })
  async function compare(event: React.FormEvent) {
    event.preventDefault()
    if (!file || (kind === 'bank' && !account)) { toast.error('Choose a CSV and the payment account when comparing a bank statement.'); return }
    setBusy(true); setResult(null); setPage(1); setBookPage(1)
    try { const data = new FormData(); data.set('file', file); data.set('kind', kind); data.set('date_from', period.date_from); data.set('date_to', period.date_to); if (kind === 'bank') data.set('account', account); setResult(await reportService.compareCSV(data)) }
    catch (error) { toast.error(apiError(error, 'Could not compare this CSV. Check the template columns.')) }
    finally { setBusy(false) }
  }
  function exportComparison() {
    if (!result) return
    const csvCell = (value: unknown) => { let text = String(value ?? ''); if (/^[\s]*[=+@-]/.test(text) && !/^-?\d+(\.\d{1,2})?$/.test(text)) text = "'" + text; return '"' + text.replaceAll('"', '""') + '"' }
    const rows = [['Source row', 'Date', 'Reference / supplier invoice', 'Amount', 'Status', 'Book matches', 'Review notes'], ...result.results.map(row => [row.row, row.date, row.number, row.amount, row.status, row.matches.map(match => match.label).join(' | '), row.detail]), ...result.unmatched_books.map(row => ['', row.date, row.label, row.amount, 'book_without_source_match', row.label, 'Review the source period and identifiers.'])]
    downloadBlob(new Blob(['\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${kind}_comparison_${period.date_from}_${period.date_to}.csv`)
  }
  const href = (match: { id: number; kind: string }) => match.kind === 'document' ? `/documents/${match.id}` : `/transactions?review_payment=${match.id}`
  return <div className="space-y-4"><h2 className="font-semibold">Compare statement or purchase invoice data</h2><p className="text-sm text-muted-foreground">Use the template to prepare a UTF-8 CSV. This is a local review tool: files are processed for comparison and are not saved as book entries. Purchase comparison accepts invoice rows; notes, amendments and ITC decisions stay with your CA.</p><form onSubmit={compare} className="grid sm:grid-cols-2 gap-4 border rounded-xl p-4"><div className="space-y-1.5"><Label htmlFor="compare-kind">Source</Label><select id="compare-kind" className={selectClass} value={kind} onChange={e => { setKind(e.target.value as 'bank' | 'purchase'); setFile(null); setResult(null) }}><option value="bank">Bank statement (signed amounts)</option><option value="purchase">Purchase invoices (prepared GSTR-2B CSV)</option></select></div>{kind === 'bank' && <div className="space-y-1.5"><Label>Payment account</Label><SearchableSelect resource="accounts" value={account} onChange={value => { setAccount(value); setResult(null) }} options={(accounts.data?.results ?? []).map(row => ({ value: String(row.id), label: row.name }))} placeholder="Select the statement account" title="Statement account" /></div>}<div className="space-y-1.5"><Label htmlFor="compare-file">CSV file · up to 5 MB / 5,000 rows</Label><Input key={kind} id="compare-file" type="file" accept=".csv,text/csv" onChange={e => { setFile(e.target.files?.[0] ?? null); setResult(null) }} /></div><div className="flex gap-2 items-end flex-wrap"><Button type="button" variant="outline" disabled={busy} onClick={async () => { try { downloadBlob(await reportService.comparisonTemplate(kind), `${kind}_comparison_template.csv`) } catch { toast.error('Could not download template.') } }}>Download CSV template</Button><Button type="submit" disabled={busy || !file}>{busy ? 'Comparing…' : 'Compare with books'}</Button></div></form>
    {result && <><p className="text-sm text-muted-foreground">{result.basis}</p><div className="flex gap-3 items-center flex-wrap"><h3 className="font-semibold">{result.results.length} source rows · {result.unmatched_books.length} book entries without a source match</h3><Button variant="outline" onClick={exportComparison}>Download comparison CSV</Button></div><div className="space-y-2">{result.results.slice((page - 1) * 50, page * 50).map(row => <Card key={row.row}><CardContent className="pt-4 space-y-2"><div className="flex justify-between gap-3"><p className="font-semibold text-sm break-words">Row {row.row} · {row.number || 'No reference'} · {row.date}</p><span className="text-xs shrink-0">{row.status.replaceAll('_', ' ')}</span></div><p className="text-xs text-muted-foreground">{row.detail}</p><div className="flex gap-3 flex-wrap">{row.matches.map(match => <Link className="text-primary text-sm" key={match.id} href={href(match)}>{match.label}</Link>)}</div></CardContent></Card>)}</div><PageButtons page={page} count={result.results.length} size={50} onPage={setPage} busy={false} />{result.unmatched_books.length > 0 && <details className="border rounded-xl p-4"><summary className="cursor-pointer text-sm font-medium">Review book entries without a source match</summary><div className="mt-3 space-y-2">{result.unmatched_books.slice((bookPage - 1) * 50, bookPage * 50).map(row => <div key={row.id} className="flex justify-between gap-3 text-sm"><Link className="text-primary" href={href(row)}>{row.label}</Link><span>{fmtDate(row.date)} · {row.amount}</span></div>)}</div><PageButtons page={bookPage} count={result.unmatched_books.length} size={50} onPage={setBookPage} busy={false} /></details>}</>}
  </div>
}
