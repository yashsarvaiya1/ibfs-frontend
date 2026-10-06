'use client'

import { useState } from 'react'
import type { Document } from '@/models/document'
import { documentService } from '@/services/documentService'
import { documentPdfName, documentShareText, whatsappNumber } from '@/lib/documentShare'
import { downloadBlob } from '@/lib/download'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Copy, Download, Loader2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

export function DocumentShareSheet({ doc, open, onOpenChange }: {
  doc: Document; open: boolean; onOpenChange: (open: boolean) => void
}) {
  const phones = doc.contact_display?.all_phones?.length
    ? doc.contact_display.all_phones
    : doc.contact_display?.phone ? [{ number: doc.contact_display.phone, name: doc.contact_display.name, role: '' }] : []
  const [phone, setPhone] = useState(phones[0]?.number ?? '')
  const [message, setMessage] = useState(() => documentShareText(doc))
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const number = whatsappNumber(phone)
  const filename = documentPdfName(doc)

  async function prepare() {
    if (downloading) return
    setDownloading(true)
    try {
      downloadBlob(await documentService.print(doc.id), filename)
      setDownloaded(true)
    } catch { toast.error('PDF download failed. Try again before opening WhatsApp.') }
    finally { setDownloading(false) }
  }

  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="rounded-t-2xl p-5 max-h-[90dvh] overflow-y-auto">
      <div className="max-w-xl w-full mx-auto space-y-4">
        <SheetHeader><SheetTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-green-600" /> Share on WhatsApp</SheetTitle></SheetHeader>
        <p className="text-sm text-muted-foreground">Download the PDF, open the chat, then attach the file from Downloads. You choose when to send.</p>
        {phones.length > 1 && <div className="flex flex-wrap gap-2" aria-label="Saved recipients">{phones.map((p, i) => <Button key={i} variant={phone === p.number ? 'secondary' : 'outline'} size="sm" onClick={() => setPhone(p.number)}>{p.name || p.number}{p.role ? ` · ${p.role}` : ''}</Button>)}</div>}
        <div className="space-y-1.5"><Label htmlFor="share-phone">WhatsApp number</Label><Input id="share-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} aria-invalid={!!phone && !number} /><p className="text-xs text-muted-foreground">Use 10 digits for India, or +country code for another country.</p>{phone && !number && <p className="text-xs text-destructive" role="alert">Enter a valid phone number with its country code.</p>}</div>
        <div className="space-y-1.5"><Label htmlFor="share-message">Message</Label><textarea id="share-message" value={message} onChange={e => setMessage(e.target.value)} rows={4} className="w-full rounded-md border bg-background p-3 text-sm" /><Button variant="ghost" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(message); toast.success('Message copied') } catch { toast.error('Select the message and copy it manually.') } }}><Copy className="h-4 w-4 mr-2" />Copy message</Button></div>
        <div className="rounded-xl border bg-muted/40 p-3 text-sm break-words"><p className="font-medium">{downloaded ? 'Download requested — attach this file in WhatsApp:' : 'PDF to download:'}</p><p className="text-muted-foreground mt-1">{filename}</p></div>
        <div className="flex flex-wrap gap-3">
          <Button className="flex-1" variant={downloaded ? 'outline' : 'default'} onClick={prepare} disabled={downloading}>{downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}{downloading ? 'Downloading…' : downloaded ? 'Download again' : '1. Download PDF'}</Button>
          {downloaded && number && message.trim() ? <Button asChild className="flex-1 bg-green-600 hover:bg-green-700 text-white"><a href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4 mr-2" />2. Open WhatsApp</a></Button> : <Button className="flex-1" disabled>2. Open WhatsApp</Button>}
        </div>
      </div>
    </SheetContent>
  </Sheet>
}
