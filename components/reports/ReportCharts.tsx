'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { fmtAmount } from '@/lib/utils'

export const REPORT_COLORS = ['#2563eb', '#d97706', '#db2777', '#059669']
export interface ChartSeries { label: string; color: string }
export interface ChartRow { label: string; values: number[] }
const compact = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 }).format(value)
export const monthLabel = (value: string) => new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(`${value}-01T00:00:00Z`))

export function ReportTrendChart({ title, description, rows, series }: { title: string; description: string; rows: ChartRow[]; series: ChartSeries[] }) {
  const id = useId()
  const plotRef = useRef<HTMLDivElement>(null)
  const [plotWidth, setPlotWidth] = useState(640)
  useEffect(() => {
    if (!plotRef.current) return
    const observer = new ResizeObserver(entries => {
      const width = Math.round(entries[0].contentRect.width)
      if (width > 0) setPlotWidth(width)
    })
    observer.observe(plotRef.current)
    return () => observer.disconnect()
  }, [])
  const [selection, setSelection] = useState<number | null>(null)
  const [hidden, setHidden] = useState<number[]>([])
  const hasValues = rows.some(row => row.values.some(value => value !== 0))
  const values = rows.flatMap(row => row.values.filter((_, i) => !hidden.includes(i)))
  const min = Math.min(0, ...values), max = Math.max(0, ...values)
  const span = max - min || 1
  const low = min < 0 ? min - span * .08 : 0, high = max + span * .1
  const x = (index: number) => rows.length === 1 ? (plotWidth + 42) / 2 : 62 + index * (plotWidth - 82) / (rows.length - 1)
  const y = (value: number) => 204 - (value - low) / (high - low) * 174
  const lastActive = rows.findLastIndex(row => row.values.some(value => value !== 0))
  const activeIndex = Math.min(selection ?? Math.max(0, lastActive), rows.length - 1)
  const selected = rows[activeIndex]
  return <section className="min-w-0 rounded-xl border bg-card p-4 space-y-3" aria-labelledby={`${id}-title`}>
    <div><h3 id={`${id}-title`} className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
    <div className="flex flex-wrap gap-x-4 gap-y-2">{series.map((item, i) => <button key={item.label} type="button" aria-pressed={!hidden.includes(i)} className={`inline-flex items-center gap-1.5 text-xs rounded focus-visible:outline-2 focus-visible:outline-primary ${hidden.includes(i) ? 'opacity-40' : ''}`} onClick={() => setHidden(current => current.includes(i) ? current.filter(index => index !== i) : [...current, i])}><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.label}</button>)}</div>
    <div ref={plotRef}>
    {!hasValues ? <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">No recorded activity in this period.</p> : <>
      <svg viewBox={`0 0 ${plotWidth} 246`} className="w-full touch-pan-y" role="img" aria-label={`${title}. Select a month below to read exact amounts.`} onPointerMove={event => { const bounds = event.currentTarget.getBoundingClientRect(); const position = (event.clientX - bounds.left) / bounds.width * plotWidth; setSelection(Math.max(0, Math.min(rows.length - 1, Math.round((position - 62) / (plotWidth - 82) * (rows.length - 1))))) }}>
        <title>{title}</title>
        {Array.from({ length: 4 }, (_, i) => low + (high - low) * i / 3).map((value, i) => <g key={i}><line x1="62" x2={plotWidth - 20} y1={y(value)} y2={y(value)} stroke="currentColor" className="text-border" strokeDasharray="3 4" /><text x="54" y={y(value) + 4} textAnchor="end" fill="currentColor" className="text-muted-foreground" fontSize="11">{compact(value)}</text></g>)}
        <line x1="62" x2={plotWidth - 20} y1={y(0)} y2={y(0)} stroke="currentColor" className="text-muted-foreground" strokeOpacity=".5" />
        {series.map((item, i) => !hidden.includes(i) && <g key={item.label}><polyline fill="none" stroke={item.color} strokeWidth="2.5" strokeLinejoin="round" points={rows.map((row, index) => `${x(index)},${y(row.values[i] ?? 0)}`).join(' ')} />{rows.length === 1 && <circle cx={x(0)} cy={y(rows[0].values[i] ?? 0)} r="4" fill={item.color} />}</g>)}
        {selected && <g><line x1={x(activeIndex)} x2={x(activeIndex)} y1="30" y2="204" stroke="currentColor" className="text-muted-foreground" strokeDasharray="3 3" />{series.map((item, i) => !hidden.includes(i) && <circle key={item.label} cx={x(activeIndex)} cy={y(selected.values[i] ?? 0)} r="4" fill={item.color} stroke="var(--card)" strokeWidth="2" />)}</g>}
        {rows.map((row, i) => (i % Math.max(1, Math.ceil(rows.length / (plotWidth < 420 ? 3 : 6))) === 0 || i === rows.length - 1) && <text key={row.label} x={x(i)} y="230" textAnchor="middle" fontSize="11" fill="currentColor" className="text-muted-foreground">{row.label}</text>)}
      </svg>
      {selected && <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs" aria-live="polite"><p className="font-medium mb-1.5">{selected.label}</p><div className="flex flex-wrap gap-x-4 gap-y-1">{series.map((item, i) => !hidden.includes(i) && <span key={item.label} className="inline-flex gap-1.5 items-center"><span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.label}: <strong className="tabular-nums font-medium">{fmtAmount(selected.values[i] ?? 0)}</strong></span>)}</div></div>}
      <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground shrink-0">View month</span><select aria-label={`${title} month`} className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-xs" value={activeIndex} onChange={event => setSelection(Number(event.target.value))}>{rows.map((row, i) => <option value={i} key={row.label}>{row.label}</option>)}</select></div>
    </>}
    </div>
  </section>
}

export function ReportBarChart({ title, description, rows }: { title: string; description: string; rows: { label: string; value: number; color?: string }[] }) {
  const id = useId()
  const negative = rows.some(row => row.value < 0)
  const scale = Math.max(1, ...rows.map(row => Math.abs(row.value)))
  const hasValues = rows.some(row => row.value !== 0)
  return <section className="min-w-0 rounded-xl border bg-card p-4 space-y-4" aria-labelledby={id}>
    <div><h3 id={id} className="text-sm font-semibold">{title}</h3><p className="text-xs text-muted-foreground mt-1">{description}</p></div>
    {!hasValues ? <p className="text-sm text-muted-foreground py-8 text-center">No recorded values in this period.</p> : <div className="space-y-3">{rows.map((row, i) => { const width = Math.abs(row.value) / scale * (negative ? 50 : 100); return <div key={row.label} className="space-y-1.5"><div className="flex justify-between gap-3 text-xs"><span>{row.label}</span><strong className="font-medium tabular-nums shrink-0">{fmtAmount(row.value)}</strong></div><div aria-hidden="true" className="h-3 rounded bg-muted relative overflow-hidden">{negative && <span className="absolute inset-y-0 left-1/2 border-l border-muted-foreground/60" />}<span className="absolute h-full rounded" style={{ width: `${width}%`, left: negative ? `${row.value < 0 ? 50 - width : 50}%` : 0, background: row.color ?? REPORT_COLORS[i % REPORT_COLORS.length] }} /></div></div> })}</div>}
    {negative && hasValues && <p className="text-xs text-muted-foreground">Negative values extend left of zero and retain their book sign.</p>}
  </section>
}
