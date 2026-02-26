// components/contacts/ContactEditSheet.tsx
'use client'

import { useState, useEffect } from 'react'
import { useUpdateContact } from '@/hooks/useContact'
import { Contact } from '@/models/contact'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props { contact: Contact; open: boolean; onClose: () => void }

export function ContactEditSheet({ contact, open, onClose }: Props) {
  const [contactName, setContactName] = useState(contact.contact_name)
  const [companyName, setCompanyName] = useState(contact.company_name ?? '')
  const [phone, setPhone]       = useState(contact.phone)
  const [gstin, setGstin]       = useState(contact.gstin ?? '')
  const [address, setAddress]   = useState(contact.address ?? '')
  const [notes, setNotes]       = useState(contact.notes ?? '')

  useEffect(() => {
    if (open) {
      setContactName(contact.contact_name)
      setCompanyName(contact.company_name ?? '')
      setPhone(contact.phone)
      setGstin(contact.gstin ?? '')
      setAddress(contact.address ?? '')
      setNotes(contact.notes ?? '')
    }
  }, [open, contact])

  const updateContact = useUpdateContact(contact.id)

  const handleSave = async () => {
    if (!contactName.trim() || !phone.trim()) {
      toast.error('Name and phone are required')
      return
    }
    try {
      await updateContact.mutateAsync({
        contact_name: contactName,
        company_name: companyName || null,
        phone,
        gstin:        gstin || null,
        address:      address || null,
        notes:        notes || null,
      })
      toast.success('Contact updated')
      onClose()
    } catch { toast.error('Failed to update') }
  }

  // Handle Soft Deletion / Restore
  const handleToggleStatus = async () => {
    const isRestoring = !contact.is_active
    const confirmMsg = isRestoring 
      ? 'Are you sure you want to restore this contact?'
      : 'Are you sure you want to delete this contact? It will be hidden from lists.'
      
    if (!confirm(confirmMsg)) return

    try {
      await updateContact.mutateAsync({ is_active: !contact.is_active })
      toast.success(`Contact ${isRestoring ? 'restored' : 'deleted'} successfully`)
      onClose()
    } catch { toast.error(`Failed to ${isRestoring ? 'restore' : 'delete'} contact`) }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="text-left flex items-center justify-between">
            <span>Edit Contact</span>
            <Button
              variant={contact.is_active ? "ghost" : "outline"}
              size="sm"
              onClick={handleToggleStatus}
              className={cn(
                "h-8 px-2.5 text-xs font-bold gap-1.5",
                contact.is_active ? "text-destructive hover:bg-destructive/10" : "text-emerald-600 border-emerald-200 bg-emerald-50"
              )}
            >
              {contact.is_active ? <><Trash2 className="h-3.5 w-3.5" /> Delete</> : <><RotateCcw className="h-3.5 w-3.5" /> Restore</>}
            </Button>
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          {contact.company_name !== null && (
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input className="h-11 rounded-xl" value={companyName} onChange={e => setCompanyName(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Contact Name <span className="text-destructive">*</span></Label>
            <Input className="h-11 rounded-xl" value={contactName} onChange={e => setContactName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone <span className="text-destructive">*</span></Label>
            <Input className="h-11 rounded-xl" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>GSTIN</Label>
            <Input className="h-11 rounded-xl" value={gstin} onChange={e => setGstin(e.target.value)} placeholder="optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input className="h-11 rounded-xl" value={address} onChange={e => setAddress(e.target.value)} placeholder="optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input className="h-11 rounded-xl" value={notes} onChange={e => setNotes(e.target.value)} placeholder="optional" />
          </div>
          <Button className="w-full h-12 mt-2 rounded-xl text-md font-bold" onClick={handleSave} disabled={updateContact.isPending}>
            {updateContact.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
