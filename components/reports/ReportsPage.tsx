'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useUIStore } from '@/stores/uiStore'
import { businessDate } from '@/lib/businessDate'
import { currentFinancialYear, financialYearPeriod, monthPeriod } from '@/lib/reportPeriod'
import { reportService, type ReportPeriod, type GSTAmounts, type GSTBucket } from '@/services/reportService'
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
import { toast } from 'sonner'

type Mode = 'ca' | 'gst'
const selectClass = 'h-10 w-full rounded-md border bg-background px-3 text-sm'
const bucketLabels: Record<GSTBucket, string> = { output: 'Sales GST', purchase: 'Purchase GST', rcm_output: 'Reverse-charge sales', rcm_purchase: 'Reverse-charge purchases', review: 'Excluded pending review' }

export function ReportsPage() {
  const [mode, setMode] = useState<Mode>('ca')
  const setTitle = useUIStore(s => s.setPageTitle)
  useEffect(() => { setTitle('Reports & CA exports') }, [setTitle])
  return <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
    <div><h1 className="text-2xl font-bold">Reports & CA exports</h1><p className="text-sm text-muted-foreground mt-1">Prepare your documents for the CA and review GST recorded in your books.</p></div>
    <div className="flex gap-2" aria-label="Report type"><Button aria-pressed={mode === 'ca'} variant={mode === 'ca' ? 'default' : 'outline'} onClick={() => setMode('ca')}><FileText className="mr-2 h-4 w-4" />CA document PDF</Button><Button aria-pressed={mode === 'gst'} variant={mode === 'gst' ? 'default' : 'outline'} onClick={() => setMode('gst')}><Calculator className="mr-2 h-4 w-4" />FY & GST</Button></div>
    <ReportContent key={mode} mode={mode} />
  </div>
}

function ReportContent({ mode }: { mode: Mode }) {
  const fy = currentFinancialYear()
  const [preset, setPreset] = useState(mode === 'gst' ? 'fy' : 'month')
  const [month, setMonth] = useState(businessDate().slice(0, 7))
  const [year, setYear] = useState(fy)
  const [draft, setDraft] = useState<ReportPeriod>(() => mode === 'gst' ? financialYearPeriod(fy) : monthPeriod(businessDate().slice(0, 7)))
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
      <Button type="submit">Show {mode === 'ca' ? 'documents' : 'GST summary'}</Button>
      {periodError && <p role="alert" className="text-sm text-destructive sm:col-span-2">{periodError}</p>}
    </form></CardContent></Card>
    <p className="text-sm text-muted-foreground">Showing {fmtDate(period.date_from)} – {fmtDate(period.date_to)}</p>
    {mode === 'ca' ? <CAReport key={`${period.date_from}-${period.date_to}-${type}`} period={period} type={type} /> : <GSTReportView key={`${period.date_from}-${period.date_to}`} period={period} />}
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
    <div className="grid sm:grid-cols-3 gap-3">{[['Sales GST after credit notes', totals.output.gst_total], ['Purchase GST after debit notes', totals.purchase.gst_total], ['Book GST difference', data.difference.gst_total]].map(([label, value]) => <Card key={label}><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold mt-1">{fmtAmount(value)}</p></CardContent></Card>)}</div>
    <div className="rounded-xl border bg-muted/40 p-4 text-sm space-y-2"><p>Purchase GST needs GSTR-2B matching and ITC review. The book GST difference is not tax payable.</p><details><summary className="cursor-pointer font-medium">How this connects to your flow</summary><p className="mt-2">{data.basis}</p><p className="text-muted-foreground">Purchase GST is the tax recorded in bills, before GSTR-2B matching and ITC eligibility review. The difference is a book comparison, not tax payable. Reverse charge and excluded documents are shown separately.</p><p className="text-muted-foreground">Tax rates apply to the whole document in the current flow. Missing item details, tax labels and unspecified fields are flagged below; nil-rated, exempt, export and mixed-rate classifications need CA review.</p></details></div>
    <div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm min-w-[720px]"><thead className="bg-muted/40"><tr><th className="text-left p-3">Tax component</th>{(Object.keys(bucketLabels) as GSTBucket[]).map(bucket => <th className="text-right p-3" key={bucket}>{bucketLabels[bucket]}</th>)}</tr></thead><tbody>{components.map(key => <tr key={key} className="border-t"><th className="text-left p-3 font-medium">{key === 'unsplit_gst' ? 'GST without split' : key === 'other_tax' ? 'Other tax (not GST)' : key.toUpperCase()}</th>{(Object.keys(bucketLabels) as GSTBucket[]).map(bucket => <td className="text-right p-3 tabular-nums" key={bucket}>{fmtAmount(totals[bucket][key])}</td>)}</tr>)}</tbody></table></div>
    <div><h2 className="font-semibold mb-3">Monthly GST in this period</h2>{!data.months.length ? <p className="text-sm text-muted-foreground">No GST documents in this period.</p> : <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[680px] text-sm"><thead className="bg-muted/40"><tr>{['Month', 'Sales GST', 'Purchase GST', 'RCM sales', 'RCM purchases', 'Excluded tax'].map(label => <th key={label} className="p-3 text-right first:text-left">{label}</th>)}</tr></thead><tbody>{data.months.map(month => <tr key={month.month} className="border-t"><th className="p-3 text-left font-medium">{month.month}</th>{(Object.keys(bucketLabels) as GSTBucket[]).map(bucket => <td className="p-3 text-right tabular-nums" key={bucket}>{fmtAmount(month.totals[bucket].gst_total)}</td>)}</tr>)}</tbody></table></div>}</div>
    <div><h2 className="font-semibold mb-3">Document breakdown <span className="text-sm text-muted-foreground font-normal">· {data.review_count} need review</span></h2><label className="flex items-center gap-2 text-sm mb-3"><Checkbox checked={reviewOnly} onCheckedChange={checked => { setReviewOnly(checked === true); setPage(1) }} />Show only documents needing review</label>{data.count === 0 && <p className="text-sm text-muted-foreground">{reviewOnly ? 'No documents need review in this period.' : 'No documents in this period.'}</p>}<div className="space-y-2">{data.results.map(row => <Card key={row.id}><CardContent className="pt-4"><div className="flex justify-between gap-3"><div className="min-w-0"><Link href={`/documents/${row.id}`} className="text-sm font-semibold text-primary break-words">{DOC_TYPE_LABELS[row.type]} #{row.doc_id}</Link><p className="text-xs text-muted-foreground mt-1 break-words">{fmtDate(row.date)} · {row.contact || 'No contact'} · {bucketLabels[row.bucket]}</p></div><div className="shrink-0 text-right"><p className="text-sm font-semibold">{row.taxable_amount === null ? 'GST unavailable' : fmtAmount(row.amounts.gst_total)}</p><p className="text-xs text-muted-foreground">GST adjustment</p></div></div>{row.issues.length > 0 && <ul className="text-xs text-amber-700 dark:text-amber-400 mt-3 space-y-1 list-disc pl-4">{row.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}</CardContent></Card>)}</div><PageButtons page={page} count={data.count} size={data.page_size} onPage={setPage} busy={query.isFetching} /></div>
  </div>
}
