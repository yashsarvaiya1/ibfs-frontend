// components/contacts/ContactEditSheet.tsx
'use client'

import { useState, useEffect } from 'react'
import { useUpdateContact } from '@/hooks/useContact'
import { Contact } from '@/models/contact'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Props { contact: Contact; open: boolean; onClose: () => void }

export function ContactEditSheet({ contact, open, onClose }: Props) {
  const [contactName, setContactName] = useState(contact.contact_name)
  const [companyName, setCompanyName] = useState(contact.company_name ?? '')
  const [phone, setPhone] = useState(contact.phone)
  const [gstin, setGstin] = useState(contact.gstin ?? '')
  const [address, setAddress] = useState(contact.address ?? '')
  const [notes, setNotes] = useState(contact.notes ?? '')

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
        gstin: gstin || null,
        address: address || null,
        notes: notes || null,
      })
      toast.success('Contact updated')
      onClose()
    } catch { toast.error('Failed to update') }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">Edit Contact</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          {contact.company_name !== null && (
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Contact Name <span className="text-destructive">*</span></Label>
            <Input value={contactName} onChange={e => setContactName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone <span className="text-destructive">*</span></Label>
            <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>GSTIN</Label>
            <Input value={gstin} onChange={e => setGstin(e.target.value)} placeholder="optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="optional" />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={updateContact.isPending}>
            {updateContact.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
