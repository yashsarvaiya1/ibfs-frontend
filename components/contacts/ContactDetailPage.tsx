'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useContact } from '@/hooks/useContact'
import { getContactDisplayName } from '@/models/contact'
import { ContactLedger } from '@/components/contacts/ContactLedger'
import { ContactDocuments } from '@/components/contacts/ContactDocuments'
import { ContactInfoSheet } from '@/components/contacts/ContactInfoSheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronLeft, CreditCard, ChevronDown } from 'lucide-react'

interface Props {
  id: number
}

export function ContactDetailPage({ id }: Props) {
  const router = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  const openTransactionSheet = useUIStore((s) => s.openTransactionSheet)

  const { data: contact, isLoading } = useContact(id)

  const [infoOpen, setInfoOpen] = useState(false)
  const [realBalance, setRealBalance] = useState<number | null>(null)

  useEffect(() => {
    setPageTitle(contact ? getContactDisplayName(contact) : 'Contact')
  }, [contact, setPageTitle])

  const handleBalanceCalculated = useCallback((balance: number) => {
    setRealBalance(balance)
  }, [])

  const handleRecordPayment = () => {
    openTransactionSheet({ contactId: id })
  }

  if (isLoading) return <ContactDetailSkeleton />
  if (!contact) return (
    <div className="flex items-center justify-center h-40">
      <p className="text-muted-foreground text-sm">Contact not found</p>
    </div>
  )

  const displayBalance = realBalance ?? parseFloat(contact.opening_balance)

  return (
    <div className="flex flex-col">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background z-20">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {/* Tappable contact name → opens info sheet */}
        <button
          onClick={() => setInfoOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted transition-colors"
        >
          <span className="text-sm font-semibold truncate max-w-[160px]">
            {getContactDisplayName(contact)}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>

        {/* Balance chip */}
        <div className={`text-sm font-bold px-2 py-0.5 rounded-full ${
          displayBalance >= 0
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-600'
        }`}>
          {displayBalance < 0 ? '−' : '+'}₹{Math.abs(displayBalance).toLocaleString('en-IN')}
        </div>
      </div>

      {/* ── Tabs — Transactions / Documents ── */}
      <Tabs defaultValue="ledger">
        <TabsList className="w-full rounded-none border-b h-10 sticky top-[57px] z-10 bg-background">
          <TabsTrigger value="ledger" className="flex-1">Transactions</TabsTrigger>
          <TabsTrigger value="documents" className="flex-1">Documents</TabsTrigger>
        </TabsList>

        {/* Extra bottom padding so content clears the fixed payment bar */}
        <TabsContent value="ledger" className="mt-0 pb-24">
          <ContactLedger
            contactId={id}
            openingBalance={contact.opening_balance}
            onBalanceCalculated={handleBalanceCalculated}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-0 pb-24">
          <ContactDocuments contactId={id} />
        </TabsContent>
      </Tabs>

      {/* ── Fixed bottom payment bar ── */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-background border-t px-4 py-3">
        <Button className="w-full" size="lg" onClick={handleRecordPayment}>
          <CreditCard className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </div>

      {/* ── Contact info sheet (tap name to open) ── */}
      <ContactInfoSheet
        contact={contact}
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
      />

    </div>
  )
}

function ContactDetailSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
