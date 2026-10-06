'use client'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'
import { clearOffline, deleteOffline, getVaultConfig, isUnlocked, listOffline, loadOffline, lockVault, observeVault, saveOffline, setupVault, unlockVault, type SavedMeta, type VaultConfig } from '@/lib/offline/vault'
import { downloadBlob } from '@/lib/download'
import { businessDate } from '@/lib/businessDate'
import { DOC_TYPE_LABELS, type DocumentCreate, type DocumentType } from '@/models/document'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { PdfViewer } from '@/components/shared/PdfViewer'
import { ItemTaxes } from '@/components/documents/ItemTaxes'
import { toast } from 'sonner'

const draftTypes: DocumentType[] = ['bill', 'invoice', 'quotation', 'po', 'pi']
const selectClass = 'h-10 rounded-md border bg-background px-3 text-sm w-full'
function message(error: unknown) { return error instanceof Error ? error.message : 'Offline storage is unavailable.' }

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback); window.addEventListener('offline', callback)
  return () => { window.removeEventListener('online', callback); window.removeEventListener('offline', callback) }
}

export function OfflineFilesPage() {
  const owner = useAuthStore(s => s.username)
  const [config, setConfig] = useState<VaultConfig | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [files, setFiles] = useState<SavedMeta[]>([])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<{ meta: SavedMeta; blob: Blob } | null>(null)
  const [draft, setDraft] = useState<{ meta: SavedMeta; data: DocumentCreate } | null>(null)
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
  const [confirmClear, setConfirmClear] = useState(false)
  const refresh = useCallback(async () => {
    try {
      const value = await getVaultConfig(); const ready = isUnlocked()
      setConfig(value); setUnlocked(ready); setFiles(ready ? await listOffline() : [])
      if (!ready) { setSelected(null); setDraft(null) }
    } catch (err) { setError(message(err)); setFiles([]); setSelected(null); setDraft(null) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { const initial = setTimeout(() => void refresh(), 0); const stop = observeVault(() => { void refresh() }); return () => { clearTimeout(initial); stop() } }, [refresh])
  useEffect(() => { const onPageHide = () => lockVault(); window.addEventListener('pagehide', onPageHide); return () => window.removeEventListener('pagehide', onPageHide) }, [])
  async function authorize(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (config) await unlockVault(password, owner)
      else { if (password !== confirm) throw new Error('Offline passwords do not match.'); await setupVault(owner ?? '', password) }
      setPassword(''); setConfirm(''); await refresh()
      // Ask the browser to retain explicitly selected local data when supported.
      if (navigator.storage?.persist) void navigator.storage.persist()
    } catch (err) { setError(message(err)) }
    finally { setBusy(false) }
  }
  async function openFile(meta: SavedMeta) {
    setBusy(true)
    try { const file = await loadOffline(meta.id, owner); if (meta.kind === 'draft') { const data = JSON.parse(await file.blob.text()) as DocumentCreate; setDraft({ meta, data }); setSelected(null) } else { setSelected(file); setDraft(null) } }
    catch (err) { toast.error(message(err)) }
    finally { setBusy(false) }
  }
  async function remove(meta: SavedMeta) { try { await deleteOffline(meta.id); if (selected?.meta.id === meta.id) setSelected(null); if (draft?.meta.id === meta.id) setDraft(null) } catch (err) { toast.error(message(err)) } }
  async function clear() { setBusy(true); try { await clearOffline(); setConfirmClear(false); setError(''); await refresh() } catch (err) { setError(message(err)) } finally { setBusy(false) } }
  async function newDraft() {
    const data: DocumentCreate = { type: 'invoice', date: businessDate(), line_items: [{ name: '', quantity: 1, rate: 0, amount: 0 }], tax_mode: 'document', charges: [], taxes: [] }
    try { const meta = await saveOffline({ title: 'New invoice draft', filename: 'invoice-draft.json', kind: 'draft' }, new Blob([JSON.stringify(data)], { type: 'application/json' }), owner); setDraft({ meta, data }); setSelected(null) } catch (err) { toast.error(message(err)) }
  }
  return <main className="min-h-screen bg-background p-4 lg:p-8"><div className="max-w-5xl mx-auto space-y-5">
    <div className="flex justify-between flex-wrap gap-3"><div><h1 className="text-2xl font-bold">Offline files & drafts</h1><p className="text-sm text-muted-foreground mt-1">{online ? 'Connection available' : 'Offline'} · Saved on this device</p></div><Link href="/" className="text-primary text-sm">Return to IBFS</Link></div>
    <p className="text-sm text-muted-foreground">Saved PDFs are snapshots. Drafts stay local until you review and save them online. Payments, stock movements and balances use the live app.</p>
    {loading ? <p role="status">Loading local storage…</p> : !unlocked ? <Card><CardContent className="pt-5 space-y-4"><h2 className="font-semibold">{config ? `Unlock files saved by ${config.owner}` : 'Enable offline access on this device'}</h2>{!config && !owner ? <Link className="text-primary text-sm" href="/login">Sign in online to set up offline access</Link> : <form className="space-y-3 max-w-md" onSubmit={authorize}><div className="space-y-1.5"><Label htmlFor="offline-password">Offline password</Label><Input id="offline-password" type="password" required minLength={8} autoComplete={config ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} /></div>{!config && <div className="space-y-1.5"><Label htmlFor="offline-confirm">Confirm password</Label><Input id="offline-confirm" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></div>}<Button disabled={busy} type="submit">{busy ? 'Opening…' : config ? 'Unlock' : 'Enable offline access'}</Button></form>}<p className="text-xs text-muted-foreground">Use a trusted device. The password protects local files and is needed again after closing or reloading the app. A forgotten password requires clearing those files.</p></CardContent></Card> : <>
      <div className="flex flex-wrap gap-2"><Button onClick={newDraft} disabled={busy}>New local draft</Button><Button variant="outline" onClick={() => lockVault()}>Lock storage</Button><Button variant="ghost" onClick={() => void refresh()}>Refresh files</Button></div>
      {!files.length && <p className="rounded-xl border p-5 text-sm text-muted-foreground">Save a document PDF or report from the online app, or create a local draft here.</p>}
      <div className="grid sm:grid-cols-2 gap-3">{files.map(meta => <Card key={meta.id}><CardContent className="pt-4 space-y-3"><div><h2 className="font-semibold text-sm break-words">{meta.title}</h2><p className="text-xs text-muted-foreground">{meta.kind === 'draft' ? 'Unposted draft' : 'Saved PDF'} · {new Date(meta.savedAt).toLocaleString()}</p>{meta.sourceUpdatedAt && <p className="text-xs text-muted-foreground">Source updated {new Date(meta.sourceUpdatedAt).toLocaleString()}</p>}</div><div className="flex gap-2 flex-wrap"><Button variant="outline" size="sm" disabled={busy} onClick={() => openFile(meta)}>{meta.kind === 'draft' ? 'Edit draft' : 'Open PDF'}</Button><Button variant="outline" size="sm" disabled={busy} onClick={async () => { try { const file = await loadOffline(meta.id, owner); downloadBlob(file.blob, meta.filename) } catch (err) { toast.error(message(err)) } }}>Download</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => remove(meta)}>Remove local copy</Button></div></CardContent></Card>)}</div>
      {selected && <section className="space-y-2"><div className="flex justify-between gap-3"><h2 className="font-semibold">{selected.meta.title}</h2><Button variant="ghost" onClick={() => setSelected(null)}>Close preview</Button></div><div className="h-[75vh] border rounded-xl overflow-hidden"><PdfViewer blob={selected.blob} /></div></section>}
      {draft && <OfflineDraftEditor key={draft.meta.id} draft={draft} onClose={() => setDraft(null)} online={online} owner={owner} />}
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {config && <div className="border-t pt-4"><p className="text-xs text-muted-foreground mb-2">Local browser storage can be removed by the browser. Keep downloaded copies of important PDFs. Signing out clears this device’s offline files.</p>{confirmClear ? <div className="space-y-2"><p className="text-sm">Delete all saved PDFs, drafts and the offline password on this device?</p><div className="flex gap-2"><Button variant="destructive" disabled={busy} onClick={clear}>Delete all local files</Button><Button variant="outline" onClick={() => setConfirmClear(false)}>Cancel</Button></div></div> : <Button variant="ghost" disabled={busy} onClick={() => setConfirmClear(true)}>Clear offline storage</Button>}</div>}
  </div></main>
}

function OfflineDraftEditor({ draft, onClose, online, owner }: { draft: { meta: SavedMeta; data: DocumentCreate }; onClose: () => void; online: boolean; owner: string | null }) {
  const [data, setData] = useState(draft.data)
  const [title, setTitle] = useState(draft.meta.title)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(true)
  const change = (next: DocumentCreate) => { setData(next); setSaved(false) }
  async function save() { setBusy(true); try { await saveOffline({ title, filename: draft.meta.filename, kind: 'draft' }, new Blob([JSON.stringify(data)], { type: 'application/json' }), owner, draft.meta.id); setSaved(true); toast.success('Local draft saved') } catch (err) { toast.error(message(err)) } finally { setBusy(false) } }
  return <section className="rounded-xl border p-4 space-y-4"><div className="flex justify-between"><h2 className="font-semibold">Edit local draft</h2><Button variant="ghost" onClick={onClose}>Close</Button></div><div className="grid sm:grid-cols-3 gap-3"><div><Label htmlFor="draft-title">Draft name</Label><Input id="draft-title" value={title} onChange={e => { setTitle(e.target.value); setSaved(false) }} /></div><div><Label htmlFor="draft-type">Document</Label><select id="draft-type" className={selectClass} value={data.type} onChange={e => change({ ...data, type: e.target.value as DocumentType })}>{draftTypes.map(type => <option key={type} value={type}>{DOC_TYPE_LABELS[type]}</option>)}</select></div><div><Label htmlFor="draft-date">Date</Label><Input id="draft-date" type="date" value={data.date} onChange={e => change({ ...data, date: e.target.value })} /></div></div>
    <p className="text-xs text-muted-foreground">Contact, references and accounting controls are checked when you continue online. Existing taxes, charges and discount are retained.</p>
    {(data.line_items ?? []).map((item, index) => <div className="border rounded-lg p-3 space-y-2" key={index}><Input aria-label={`Draft item ${index + 1}`} placeholder="Item description" value={item.name} onChange={e => change({ ...data, line_items: data.line_items!.map((row, i) => i === index ? { ...row, name: e.target.value } : row) })} /><div className="grid grid-cols-3 gap-2">{(['quantity', 'rate', 'amount'] as const).map(field => <div key={field}><Label>{field}</Label><Input aria-label={`Draft ${field} ${index + 1}`} type="number" min="0" step="0.01" value={item[field] ?? ''} onChange={e => { const value = Number(e.target.value); change({ ...data, line_items: data.line_items!.map((row, i) => { if (i !== index) return row; const changed = { ...row, [field]: value }; if (field !== 'amount') changed.amount = Number(((changed.quantity ?? 0) * (changed.rate ?? 0)).toFixed(2)); return changed }) }) }} /></div>)}</div><Input aria-label={`Draft HSN ${index + 1}`} placeholder="HSN/SAC when known" value={item.hsn ?? ''} onChange={e => change({ ...data, line_items: data.line_items!.map((row, i) => i === index ? { ...row, hsn: e.target.value } : row) })} />{data.tax_mode === 'item' && <ItemTaxes label={`draft item ${index + 1}`} taxes={item.taxes ?? []} category={item.supply_category} onCategory={category => change({ ...data, line_items: data.line_items!.map((row, i) => i === index ? { ...row, supply_category: category } : row) })} onChange={taxes => change({ ...data, line_items: data.line_items!.map((row, i) => i === index ? { ...row, taxes } : row) })} />}<Button variant="ghost" size="sm" onClick={() => change({ ...data, line_items: data.line_items!.filter((_, i) => i !== index) })}>Remove item</Button></div>)}
    <Button variant="outline" onClick={() => change({ ...data, line_items: [...data.line_items ?? [], { name: '', quantity: 1, rate: 0, amount: 0 }] })}>Add item</Button><div><Label htmlFor="draft-notes">Notes</Label><textarea id="draft-notes" className="w-full min-h-24 border rounded-md p-3 text-sm" value={data.notes ?? ''} onChange={e => change({ ...data, notes: e.target.value })} /></div>
    <div className="flex flex-wrap gap-3 items-center"><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save draft locally'}</Button>{saved && online && <Link className="text-sm text-primary" href={`/documents/new?type=${data.type}&offline_draft=${draft.meta.id}`}>Review and create online</Link>}{!saved && <p className="text-xs text-muted-foreground">Save your edits before continuing online.</p>}{!online && <p className="text-xs text-muted-foreground">Continue online once connected.</p>}</div>
  </section>
}
