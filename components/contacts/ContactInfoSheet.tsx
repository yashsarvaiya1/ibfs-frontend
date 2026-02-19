'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDeleteContact } from '@/hooks/useContact'
import { Contact, getContactDisplayName, getContactInitial } from '@/models/contact'
import { ContactFormSheet } from '@/components/contacts/ContactFormSheet'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Phone, MapPin, Building2, Edit, Trash2 } from 'lucide-react'

interface Props {
  contact: Contact
  open: boolean
  onClose: () => void
}

export function ContactInfoSheet({ contact, open, onClose }: Props) {
  const router = useRouter()
  const deleteContact = useDeleteContact()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleDelete = async () => {
    await deleteContact.mutateAsync(contact.id)
    onClose()
    router.replace('/contacts')
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto px-4 pb-8">
          <SheetHeader className="mb-4">
            <div className="flex items-center justify-between">
              <SheetTitle>Contact Details</SheetTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { onClose(); setEditOpen(true) }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {/* Avatar + name */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-primary">
                {getContactInitial(contact)}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight">
                {getContactDisplayName(contact)}
              </h2>
              {contact.company_name && contact.contact_name && (
                <p className="text-sm text-muted-foreground">{contact.contact_name}</p>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            {contact.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`tel:${contact.phone}`} className="text-primary">
                  {contact.phone}
                </a>
              </div>
            )}
            {contact.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{contact.address}</span>
              </div>
            )}
            {contact.gstin && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                  {contact.gstin}
                </span>
              </div>
            )}
            {contact.notes && (
              <p className="text-sm text-muted-foreground italic">{contact.notes}</p>
            )}
          </div>

          {/* Additional contacts */}
          {contact.additional_contacts?.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Additional Contacts
                </p>
                {contact.additional_contacts.map((ac, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{ac.name}</span>
                    <a href={`tel:${ac.phone}`} className="text-primary ml-auto">
                      {ac.phone}
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}

        </SheetContent>
      </Sheet>

      {/* Edit sheet — opens after info sheet closes */}
      <ContactFormSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        contact={contact}
      />

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact?</DialogTitle>
            <DialogDescription>
              This will soft delete {getContactDisplayName(contact)}.
              All linked transactions and documents remain intact.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={deleteContact.isPending}
            >
              {deleteContact.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
