// components/contacts/ContactCreateSheet.tsx
'use client'

import { useState } from 'react'
import { useCreateContact } from '@/hooks/useContact'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

interface Props { open: boolean; onClose: () => void }

export function ContactCreateSheet({ open, onClose }: Props) {
  const [type, setType] = useState<'individual' | 'company'>('individual')
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [gstin, setGstin] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [obAmount, setObAmount] = useState('')
  const [obType, setObType] = useState<'they_owe_us' | 'we_owe_them'>('they_owe_us')

  const createContact = useCreateContact()

  const reset = () => {
    setType('individual'); setCompanyName(''); setContactName('')
    setPhone(''); setGstin(''); setAddress(''); setNotes('')
    setObAmount(''); setObType('they_owe_us')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    if (!contactName.trim() || !phone.trim()) {
      toast.error('Contact name and phone are required')
      return
    }
    const ob = obAmount ? Number(obAmount) : 0
    // They owe us = negative (they owe us money = negative CF for us)
    const opening_balance = obType === 'they_owe_us' ? -Math.abs(ob) : Math.abs(ob)

    try {
      await createContact.mutateAsync({
        company_name: type === 'company' ? companyName : null,
        contact_name: contactName,
        phone,
        additional_contacts: [],
        opening_balance: opening_balance.toString(),
        gstin: gstin || null,
        address: address || null,
        notes: notes || null,
        is_active: true,
      })
      toast.success('Contact created')
      handleClose()
    } catch {
      toast.error('Failed to create contact')
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">New Contact</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as 'individual' | 'company')}>
            <TabsList className="w-full">
              <TabsTrigger value="individual" className="flex-1">Individual</TabsTrigger>
              <TabsTrigger value="company" className="flex-1">Company</TabsTrigger>
            </TabsList>
          </Tabs>

          {type === 'company' && (
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Contact Name <span className="text-destructive">*</span></Label>
            <Input placeholder="Full name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Phone <span className="text-destructive">*</span></Label>
            <Input type="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>GSTIN <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input placeholder="27AABCDEF34..." value={gstin} onChange={(e) => setGstin(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Address <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Notes <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input placeholder="Notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Opening Balance <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input type="number" placeholder="0.00" value={obAmount} onChange={(e) => setObAmount(e.target.value)} />
            <Tabs value={obType} onValueChange={(v) => setObType(v as 'they_owe_us' | 'we_owe_them')}>
              <TabsList className="w-full">
                <TabsTrigger value="they_owe_us" className="flex-1 text-xs">They owe us</TabsTrigger>
                <TabsTrigger value="we_owe_them" className="flex-1 text-xs">We owe them</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={createContact.isPending}>
            {createContact.isPending ? 'Saving...' : 'Save Contact'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
