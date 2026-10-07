'use client'
import { useState } from 'react'
import { ChevronDown, Paperclip } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UploadInput } from '@/components/shared/common/UploadInput'

export function DocumentExtras({ notes, onNotes, attachments, onAttachments, onPreview }: { notes: string; onNotes: (value: string) => void; attachments: string[]; onAttachments: (value: string[]) => void; onPreview: (index: number) => void }) {
  const [open, setOpen] = useState(false)
  return <section className="rounded-xl border bg-muted/10">
    <button type="button" aria-expanded={open} className="w-full flex items-center justify-between p-3 text-sm font-medium" onClick={() => setOpen(!open)}><span className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-muted-foreground" />Notes & attachments{attachments.length > 0 && <span className="text-muted-foreground">({attachments.length})</span>}{notes && <span className="text-xs text-muted-foreground">· Note added</span>}</span><ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} /></button>
    {open && <div className="border-t p-3 space-y-4"><div className="space-y-1.5"><Label>Notes</Label><Input aria-label="Notes" placeholder="Internal remarks (optional)" value={notes} onChange={e => onNotes(e.target.value)} /></div><div className="space-y-2"><Label>Attachments</Label><UploadInput value={attachments} onChange={onAttachments} context="document" maxFiles={10} onPreview={onPreview} /></div></div>}
  </section>
}
