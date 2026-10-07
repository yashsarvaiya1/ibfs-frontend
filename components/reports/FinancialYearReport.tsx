'use client'
import { ReportTrendChart, REPORT_COLORS, monthLabel } from './ReportCharts'
import { LoadingState } from '@/components/shared/common/LoadingState'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { reportService, type FYAmounts } from '@/services/reportService'
import { currentFinancialYear } from '@/lib/reportPeriod'
import { fmtAmount, fmtDate } from '@/lib/utils'
import { downloadBlob } from '@/lib/download'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { SaveOfflineButton } from '@/components/offline/SaveOfflineButton'
import { toast } from 'sonner'

const columns: [keyof FYAmounts, string][] = [['net_sales', 'Sales after credit notes'], ['net_purchases', 'Purchases after debit notes'], ['expenses', 'Expense documents'], ['other_income', 'Other income receipts'], ['cash_received', 'Cash received'], ['cash_paid', 'Cash paid']]
export function FinancialYearReport() {
  const current = currentFinancialYear()
  const [year, setYear] = useState(current)
  const [busy, setBusy] = useState('')
  const query = useQuery({ queryKey: ['financial-year-report', year], queryFn: () => reportService.financialYear(year) })
  async function download(format: 'pdf' | 'csv') {
    setBusy(format)
    try { downloadBlob(await reportService.financialYearExport(year, format), `FY_Business_${year}_${year + 1}.${format}`) }
    catch { toast.error('Could not export the financial year report.') }
    finally { setBusy('') }
  }
  const report = query.data
  return <div className="space-y-5"><div className="space-y-2 max-w-sm"><Label htmlFor="business-fy">Financial year (April–March)</Label><select id="business-fy" className="h-10 w-full rounded-md border bg-background px-3" value={year} onChange={event => setYear(Number(event.target.value))}>{Array.from({ length: 8 }, (_, i) => current - i).map(y => <option key={y} value={y}>{y}–{String(y + 1).slice(2)}</option>)}</select></div>
    {query.isPending ? <LoadingState label="Preparing financial year business report…" className="py-4" /> : query.isError || !report ? <p role="alert">Could not load the business report. <Button onClick={() => query.refetch()}>Retry</Button></p> : <>
      <p className="text-sm text-muted-foreground">{fmtDate(report.date_from)} – {fmtDate(report.date_to)}</p>
      <div className="flex gap-2 flex-wrap"><Button variant="outline" disabled={!!busy} loading={busy === 'pdf'} onClick={() => download('pdf')}>Download FY PDF</Button><Button variant="outline" disabled={!!busy} loading={busy === 'csv'} onClick={() => download('csv')}>Download FY CSV</Button><SaveOfflineButton load={() => reportService.financialYearExport(year, 'pdf')} title={`FY business ${year}–${year + 1}`} filename={`FY_Business_${year}_${year + 1}.pdf`} /></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{columns.map(([key, label]) => <Card key={key}><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold mt-1">{fmtAmount(report.totals[key])}</p>{['net_sales', 'net_purchases', 'expenses'].includes(key) && <p className="text-xs text-muted-foreground mt-1">Including tax</p>}</CardContent></Card>)}</div>
      <div className="grid xl:grid-cols-2 gap-4">
        <ReportTrendChart title="Monthly business activity" description="Sales and purchases after credit/debit notes, expenses and other income. Document values include tax." series={[{label: 'Sales', color: REPORT_COLORS[0]}, {label: 'Purchases', color: REPORT_COLORS[1]}, {label: 'Expenses', color: REPORT_COLORS[2]}, {label: 'Other income', color: REPORT_COLORS[3]}]} rows={report.months.map(month => ({ label: monthLabel(month.month), values: [Number(month.net_sales), Number(month.net_purchases), Number(month.expenses), Number(month.other_income)] }))} />
        <ReportTrendChart title="Monthly cash flow" description="Actual receipts and payments across your accounts. Self transfers are excluded." series={[{label: 'Received', color: REPORT_COLORS[3]}, {label: 'Paid', color: REPORT_COLORS[2]}]} rows={report.months.map(month => ({ label: monthLabel(month.month), values: [Number(month.cash_received), Number(month.cash_paid)] }))} />
      </div>
      <p className="rounded-xl border bg-muted/30 p-3 text-sm">Net cash movement: <strong>{fmtAmount(Number(report.totals.cash_received) - Number(report.totals.cash_paid))}</strong><span className="text-muted-foreground"> · Receipts less payments; this is not business profit.</span></p>
      <p className="text-sm text-muted-foreground">{report.basis}</p>
      <details className="rounded-xl border p-4"><summary className="cursor-pointer font-medium">Document counts and known pre-tax values</summary><div className="space-y-2 mt-3">{Object.entries(report.document_counts).map(([key, count]) => <p className="text-sm" key={key}>{key.replaceAll('_', ' ')}: {count}</p>)}<p>Known pre-tax sales after credit notes: {fmtAmount(report.known_pre_tax.net_sales)}</p><p>Known pre-tax purchases after debit notes: {fmtAmount(report.known_pre_tax.net_purchases)}</p><p className="text-xs text-muted-foreground">Pre-tax figures exclude documents with missing item details or inconsistent totals ({report.review.length}).</p></div></details>
      <div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm min-w-[720px]"><thead className="bg-muted/40"><tr><th className="p-3 text-left">Month</th>{columns.map(([key, label]) => <th className="p-3 text-right" key={key}>{label}</th>)}</tr></thead><tbody>{report.months.map(month => <tr className="border-t" key={month.month}><th className="p-3 text-left">{month.month}</th>{columns.map(([key]) => <td key={key} className="p-3 text-right">{fmtAmount(month[key])}</td>)}</tr>)}</tbody></table></div>
      {report.review.length > 0 && <details className="rounded-xl border p-4"><summary className="cursor-pointer">Pre-tax values needing review ({report.review.length})</summary><div className="space-y-2 mt-3">{report.review.map(row => <p key={row.id} className="text-sm"><Link className="text-primary" href={`/documents/${row.id}`}>{row.doc_id}</Link> · {row.reason}</p>)}</div></details>}
    </>}
  </div>
}
