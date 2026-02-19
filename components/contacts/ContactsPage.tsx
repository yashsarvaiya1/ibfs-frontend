'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useContacts } from '@/hooks/useContact'
import { getContactDisplayName, getContactInitial } from '@/models/contact'
import { ContactFormSheet } from '@/components/contacts/ContactFormSheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, ChevronRight, Phone, Building2, User } from 'lucide-react'

export function ContactsPage() {
  const router = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    setPageTitle('Contacts')
  }, [setPageTitle])

  // Debounce search — 300ms prevents firing on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useContacts(
    debouncedSearch.trim() ? { search: debouncedSearch.trim() } : undefined
  )

  const contacts = data?.results ?? []

  return (
    <div className="flex flex-col">

      {/* Search bar + Add button */}
      <div className="sticky top-0 z-30 bg-background border-b px-4 py-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="icon" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* List */}
      <div className="divide-y">
        {!hasHydrated || isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <ContactSkeleton key={i} />)
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">No contacts found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {debouncedSearch ? 'Try a different search' : 'Add your first contact'}
            </p>
            {!debouncedSearch && (
              <Button className="mt-4" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            )}
          </div>
        ) : (
          contacts.map((contact) => {
            const isCompany = !!contact.company_name
            return (
              <button
                key={contact.id}
                onClick={() => router.push(`/contacts/${contact.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors text-left"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-primary">
                    {getContactInitial(contact)}
                  </span>
                </div>

                {/* Name + phone */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isCompany
                      ? <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                      : <User className="h-3 w-3 text-muted-foreground shrink-0" />
                    }
                    <p className="font-medium text-sm truncate">
                      {getContactDisplayName(contact)}
                    </p>
                  </div>
                  {contact.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" />
                      {contact.phone}
                    </p>
                  )}
                  {!contact.phone && contact.gstin && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      GST: {contact.gstin}
                    </p>
                  )}
                </div>

                {/* Chevron only */}
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            )
          })
        )}
      </div>

      <ContactFormSheet open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}

function ContactSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-4" />
    </div>
  )
}
