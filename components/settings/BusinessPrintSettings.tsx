'use client'

import { useEffect, useState } from 'react'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { settingsService } from '@/services/settingsService'
import type { SettingsUpdate } from '@/models/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileText, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

const fields = [
  ['company_name', 'Business name'], ['company_gstin', 'GSTIN'],
  ['company_phone', 'Phone'], ['company_email', 'Email'],
  ['company_address', 'Business address'], ['payment_details', 'Payment details'],
  ['print_terms', 'Default print terms'], ['signatory_name', 'Signatory name'],
] as const
const multiline = new Set<string>(['company_address', 'payment_details', 'print_terms'])

export function BusinessPrintSettings() {
  const { data: settings } = useSettings()
  const update = useUpdateSettings()
  const [draft, setDraft] = useState<SettingsUpdate>({})
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => {
    if (!settings || dirty) return
    setDraft(Object.fromEntries([...fields.map(([key]) => [key, settings[key]]),
      ['letterhead_mode', settings.letterhead_mode], ['letterhead_height_mm', settings.letterhead_height_mm],
      ['letterhead_footer_mm', settings.letterhead_footer_mm]]))
  }, [settings, dirty])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const save = async () => {
    try {
      await update.mutateAsync(draft)
      setDirty(false)
      toast.success('Business and print details saved')
      return true
    } catch (error) {
      const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data
      toast.error(data ? Object.entries(data).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value)}`).join('\n') : 'Could not save print details')
      return false
    }
  }
  const showPreview = async (type: 'invoice' | 'bill') => {
    setBusy(true)
    try {
      if (dirty && !await save()) return
      setPreview(URL.createObjectURL(await settingsService.preview(type)))
    } catch { toast.error('Could not generate preview. Please try again.') }
    finally { setBusy(false) }
  }
  if (!settings) return null
  return <section className="space-y-2">
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Business &amp; document layout</h2>
    <Card><CardContent className="p-4 sm:p-6 space-y-5">
      <div><p className="font-semibold">Make every document yours</p><p className="text-sm text-muted-foreground mt-1">These details appear on your PDFs. All fields are optional; add what your business needs.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label]) => <div key={key} className="space-y-1.5">
          <Label htmlFor={`print-${key}`}>{label}</Label>
          {multiline.has(key)
            ? <Textarea id={`print-${key}`} rows={3} value={draft[key] ?? ''} onChange={e => { setDraft(d => ({ ...d, [key]: e.target.value })); setDirty(true) }} />
            : <Input id={`print-${key}`} type={key === 'company_email' ? 'email' : 'text'} value={draft[key] ?? ''} onChange={e => { setDraft(d => ({ ...d, [key]: e.target.value })); setDirty(true) }} />}
        </div>)}
      </div>
      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-medium">Letterhead placement</summary>
        <div className="grid gap-4 sm:grid-cols-3 mt-4">
          <div className="space-y-1.5"><Label htmlFor="letterhead-mode">Format</Label>
            <select id="letterhead-mode" className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={draft.letterhead_mode ?? 'banner'} onChange={e => { setDraft(d => ({ ...d, letterhead_mode: e.target.value as 'banner' | 'page' })); setDirty(true) }}>
              <option value="banner">Header banner</option><option value="page">Full-page letterhead</option>
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="letterhead-height">Header space (mm)</Label><Input id="letterhead-height" type="number" min={15} max={65} value={draft.letterhead_height_mm ?? 32} onChange={e => { setDraft(d => ({ ...d, letterhead_height_mm: Number(e.target.value) })); setDirty(true) }} /></div>
          <div className="space-y-1.5"><Label htmlFor="letterhead-footer">Footer space (mm)</Label><Input id="letterhead-footer" type="number" min={10} max={40} value={draft.letterhead_footer_mm ?? 20} onChange={e => { setDraft(d => ({ ...d, letterhead_footer_mm: Number(e.target.value) })); setDirty(true) }} /></div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Use a wide image for a banner. For a full-page image, reserve enough space above and below the content for your printed letterhead. Preview before using it.</p>
      </details>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!dirty || update.isPending || busy} onClick={save} className="gap-2">{update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save details</Button>
        <Button variant="outline" disabled={busy || update.isPending} onClick={() => showPreview('invoice')} className="gap-2"><FileText className="h-4 w-4" />Preview invoice</Button>
        <Button variant="outline" disabled={busy || update.isPending} onClick={() => showPreview('bill')}>Preview bill</Button>
        {busy && <Loader2 aria-label="Generating preview" className="h-5 w-5 animate-spin self-center" />}
      </div>
    </CardContent></Card>
    <Dialog open={!!preview} onOpenChange={open => { if (!open) setPreview(null) }}>
      <DialogContent className="sm:max-w-4xl h-[90dvh] flex flex-col">
        <DialogHeader><DialogTitle>Document preview</DialogTitle></DialogHeader>
        {preview && <><iframe title="Sample document PDF" src={preview} className="w-full flex-1 rounded-lg border bg-white" /><a href={preview} download="document-preview.pdf" className="text-sm text-primary underline">Download preview</a></>}
      </DialogContent>
    </Dialog>
  </section>
}
