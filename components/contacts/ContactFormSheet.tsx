// components/contacts/ContactFormSheet.tsx

'use client'

import { useEffect, useState } from 'react'
import { useCreateContact, useUpdateContact } from '@/hooks/useContact'
import { Contact, ContactFormData } from '@/models/contact'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2 } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  contact?: Contact   // if provided → edit mode
}

const empty: ContactFormData = {
  company_name: '',
  contact_name: '',
  phone: '',
  opening_balance: '0',
  gstin: '',
  address: '',
  notes: '',
  additional_contacts: [],
}

export function ContactFormSheet({ open, onClose, contact }: Props) {
  const isEdit = !!contact
  const createContact = useCreateContact()
  const updateContact = useUpdateContact()

  const [form, setForm] = useState<ContactFormData>(empty)

  // Populate form in edit mode
  useEffect(() => {
    if (contact) {
      setForm({
        company_name: contact.company_name ?? '',
        contact_name: contact.contact_name ?? '',
        phone: contact.phone ?? '',
        opening_balance: contact.opening_balance,
        gstin: contact.gstin ?? '',
        address: contact.address ?? '',
        notes: contact.notes ?? '',
        additional_contacts: contact.additional_contacts ?? [],
      })
    } else {
      setForm(empty)
    }
  }, [contact, open])

  const set = (key: keyof ContactFormData, value: any) =>
    setForm((f) => ({ ...f, [key]: value }))

  const addAdditionalContact = () =>
    setForm((f) => ({
      ...f,
      additional_contacts: [
        ...(f.additional_contacts ?? []),
        { name: '', phone: '' },
      ],
    }))

  const removeAdditionalContact = (i: number) =>
    setForm((f) => ({
      ...f,
      additional_contacts: f.additional_contacts?.filter((_, idx) => idx !== i),
    }))

  const updateAdditionalContact = (i: number, key: 'name' | 'phone', value: string) =>
    setForm((f) => ({
      ...f,
      additional_contacts: f.additional_contacts?.map((c, idx) =>
        idx === i ? { ...c, [key]: value } : c
      ),
    }))

  const handleSubmit = async () => {
    const payload: ContactFormData = {
      ...form,
      company_name: form.company_name || undefined,
      contact_name: form.contact_name || undefined,
      phone: form.phone || undefined,
      gstin: form.gstin || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
    }

    if (isEdit && contact) {
      await updateContact.mutateAsync({ id: contact.id, data: payload })
    } else {
      await createContact.mutateAsync(payload)
    }
    onClose()
  }

  const loading = createContact.isPending || updateContact.isPending

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto px-4 pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle>{isEdit ? 'Edit Contact' : 'New Contact'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">

          {/* Company */}
          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input
              placeholder="e.g. Acme Pvt Ltd"
              value={form.company_name}
              onChange={(e) => set('company_name', e.target.value)}
            />
          </div>

          {/* Contact name */}
          <div className="space-y-1.5">
            <Label>Contact Person</Label>
            <Input
              placeholder="e.g. Raj Sharma"
              value={form.contact_name}
              onChange={(e) => set('contact_name', e.target.value)}
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              type="tel"
              placeholder="e.g. 9876543210"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </div>

          {/* Opening balance */}
          <div className="space-y-1.5">
            <Label>Opening Balance</Label>
            <Input
              type="number"
              placeholder="0"
              value={form.opening_balance}
              onChange={(e) => set('opening_balance', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Positive = they owe you · Negative = you owe them
            </p>
          </div>

          {/* GSTIN */}
          <div className="space-y-1.5">
            <Label>GSTIN</Label>
            <Input
              placeholder="e.g. 27AAPFU0939F1ZV"
              value={form.gstin}
              onChange={(e) => set('gstin', e.target.value.toUpperCase())}
              maxLength={15}
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input
              placeholder="Full address"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input
              placeholder="Any notes..."
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          <Separator />

          {/* Additional contacts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Additional Contacts</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addAdditionalContact}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {(form.additional_contacts ?? []).map((ac, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Name"
                    value={ac.name}
                    onChange={(e) => updateAdditionalContact(i, 'name', e.target.value)}
                  />
                  <Input
                    placeholder="Phone"
                    type="tel"
                    value={ac.phone}
                    onChange={(e) => updateAdditionalContact(i, 'phone', e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive mt-1 shrink-0"
                  onClick={() => removeAdditionalContact(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? isEdit ? 'Saving...' : 'Creating...'
              : isEdit ? 'Save Changes' : 'Create Contact'
            }
          </Button>

        </div>
      </SheetContent>
    </Sheet>
  )
}
