// components/contacts/ContactsPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useContacts } from '@/hooks/useContact'
import { getContactDisplayName } from '@/models/contact'
import { cfColor, cfLabel } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, ChevronRight } from 'lucide-react'
import { ContactCreateSheet } from './ContactCreateSheet'

export function ContactsPage() {
  const router = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  useEffect(() => setPageTitle('Contacts'), [setPageTitle])

  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useContacts({ search: search || undefined, is_active: true })
  const contacts = data?.results ?? []

  return (
    <div className="px-4 py-4 space-y-4">

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="icon" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <Card
              key={contact.id}
              className="cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => router.push(`/contacts/${contact.id}`)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{getContactDisplayName(contact)}</p>
                  <p className="text-xs text-muted-foreground">{contact.phone}</p>
                  {contact.company_name && (
                    <p className="text-xs text-muted-foreground truncate">{contact.contact_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <p className={`text-sm font-bold ${cfColor(contact.opening_balance)}`}>
                    {cfLabel(contact.opening_balance)}
                  </p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
          {contacts.length === 0 && !isLoading && (
            <p className="text-center text-muted-foreground text-sm py-12">
              {search ? 'No contacts found' : 'No contacts yet. Tap + to add one.'}
            </p>
          )}
        </div>
      )}

      <ContactCreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
