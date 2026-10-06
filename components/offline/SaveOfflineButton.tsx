'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { getVaultConfig, isUnlocked, saveOffline, setupVault, unlockVault, type VaultConfig } from '@/lib/offline/vault'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { toast } from 'sonner'
import Link from 'next/link'

interface Props { load: () => Promise<Blob>; title: string; filename: string; kind?: 'pdf' | 'draft'; sourceUpdatedAt?: string; existingId?: string; disabled?: boolean; label?: string }
export function SaveOfflineButton({ load, title, filename, kind = 'pdf', sourceUpdatedAt, existingId, disabled, label = 'Save offline' }: Props) {
  const router = useRouter()
  const owner = useAuthStore(s => s.username)
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<VaultConfig | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function persist() {
    const blob = await load()
    await saveOffline({ title, filename, kind, sourceUpdatedAt }, blob, owner, existingId)
    toast.success(kind === 'draft' ? 'Draft saved on this device' : 'PDF saved on this device', { action: { label: 'Open offline files', onClick: () => { router.push('/offline') } } })
  }
  async function start() {
    setBusy(true); setError('')
    try { if (isUnlocked()) await persist(); else { setConfig(await getVaultConfig()); setOpen(true) } }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save offline.') }
    finally { setBusy(false) }
  }
  async function authorize(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (!config) { if (password !== confirm) throw new Error('Offline passwords do not match.'); await setupVault(owner ?? '', password) }
      else await unlockVault(password, owner)
      await persist(); setOpen(false); setPassword(''); setConfirm('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save offline.') }
    finally { setBusy(false) }
  }
  return <><Button type="button" variant="outline" disabled={disabled || busy} onClick={start}>{busy ? 'Saving…' : label}</Button>
    <Sheet open={open} onOpenChange={value => { if (!busy) { setOpen(value); setPassword(''); setConfirm('') } }}><SheetContent className="p-5 space-y-5 overflow-y-auto"><SheetHeader><SheetTitle>{config ? 'Unlock offline storage' : 'Set up offline storage'}</SheetTitle><SheetDescription>Save selected PDFs and drafts on this device, protected with a separate offline password.</SheetDescription></SheetHeader><form onSubmit={authorize} className="space-y-4"><div className="space-y-2"><Label htmlFor="save-offline-password">Offline password</Label><Input id="save-offline-password" type="password" minLength={8} required autoComplete={config ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} /></div>{!config && <div className="space-y-2"><Label htmlFor="save-offline-confirm">Confirm offline password</Label><Input id="save-offline-confirm" type="password" minLength={8} required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></div>}<p className="text-xs text-muted-foreground">Use a trusted device. A forgotten offline password requires clearing local files. Browser storage can be removed by the browser; keep downloaded copies of important documents.</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save on this device'}</Button></form><Link href="/offline" className="text-sm text-primary">Manage saved files</Link></SheetContent></Sheet>
  </>
}
