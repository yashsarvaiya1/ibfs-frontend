// components/contacts/ContactsPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useContacts } from '@/hooks/useContact'
import { getContactDisplayName } from '@/models/contact'
import { cfColor, cfLabel, cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, ChevronRight, Trash2, Users } from 'lucide-react'
import { ContactCreateSheet } from './ContactCreateSheet'

export function ContactsPage() {
  const router = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  
  useEffect(() => setPageTitle('Contacts'), [setPageTitle])

  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  // Bypass strict type checking for is_active if it's not explicitly in the type definition yet
  const { data, isLoading } = useContacts({ 
    search: search || undefined, 
    is_active: showDeleted ? false : true 
  } as any)
  
  const contacts = data?.results ?? []

  return (
    <div className="px-4 py-4 space-y-4 pb-10">

      {/* Header Actions */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-9 h-11 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="icon" className="h-11 w-11 rounded-xl shadow-sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Filter Toggle */}
      <div className="flex gap-2">
        <Button
          variant={!showDeleted ? "default" : "outline"}
          size="sm"
          className={cn("rounded-lg h-8 px-4 text-xs font-semibold", !showDeleted && "shadow-sm")}
          onClick={() => setShowDeleted(false)}
        >
          Active
        </Button>
        <Button
          variant={showDeleted ? "destructive" : "outline"}
          size="sm"
          className={cn("rounded-lg h-8 px-4 text-xs font-semibold gap-1.5", showDeleted && "bg-destructive/10 text-destructive border-destructive/30 shadow-sm")}
          onClick={() => setShowDeleted(true)}
        >
          <Trash2 className="h-3.5 w-3.5" /> Deleted
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2.5">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2.5">
          {contacts.map((contact) => (
            <Card
              key={contact.id}
              className={cn(
                "cursor-pointer active:scale-[0.99] transition-all rounded-xl shadow-sm",
                !contact.is_active ? "opacity-70 bg-muted/40 border-dashed" : "border-border/80 hover:bg-muted/20"
              )}
              onClick={() => router.push(`/contacts/${contact.id}`)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-foreground/90 truncate">{getContactDisplayName(contact)}</p>
                    {!contact.is_active && (
                      <Badge variant="destructive" className="text-[9px] h-4 px-1.5 rounded-md">Deleted</Badge>
                    )}
                  </div>
                  
                  <p className="text-xs font-medium text-muted-foreground">{contact.phone}</p>
                  
                  {contact.company_name && (
                    <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5 uppercase tracking-wider font-semibold">
                      {contact.contact_name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-3 shrink-0">
                  <div className="text-right">
                    {/* FIXED: using current_cf returned by DRF instead of non-existent running_cf */}
                    <p className={cn("text-sm font-black", cfColor(contact.current_cf))}>
                      {cfLabel(contact.current_cf)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          ))}
          
          {contacts.length === 0 && !isLoading && (
            <div className="text-center py-16 flex flex-col items-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                <Users className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                {showDeleted 
                  ? 'No deleted contacts found' 
                  : search 
                    ? 'No contacts match your search' 
                    : 'No contacts yet. Tap + to add one.'}
              </p>
            </div>
          )}
        </div>
      )}

      <ContactCreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
