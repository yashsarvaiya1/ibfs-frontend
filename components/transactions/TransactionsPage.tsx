'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import {
  useTransactions,
  useDeleteTransaction,
} from '@/hooks/useTransaction'
import { useContact, useContacts } from '@/hooks/useContact'
import { useAccounts } from '@/hooks/useAccount'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TransactionCard } from '@/components/shared/TransactionCard'
import { EditTransactionSheet } from '@/components/shared/EditTransactionSheet'
import { PrintSheet } from '@/components/shared/PrintSheet'
import { SearchableSelect } from '@/components/shared/common/SearchableSelect'
import { cn, fmtAmount, fmtDate } from '@/lib/utils'
import {
  SlidersHorizontal,
  X,
  Printer,
  ChevronLeft,
  ChevronRight,
  Check,
  CalendarDays,
  Users,
  Landmark,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  FinancialTransaction
} from '@/models/transaction'

type TxnTypeFilter = 'actual' | 'record' | 'contra' | 'expense'
type GroupBy = '' | 'contact' | 'account'

const TYPE_OPTIONS: { label: string; value: TxnTypeFilter; desc: string }[] = [
  { label: 'Settled', value: 'actual', desc: 'Actual payments made/received' },
  { label: 'Expected', value: 'record', desc: 'Linked document records' },
  { label: 'Transfer', value: 'contra', desc: 'Account-to-account transfers' },
  { label: 'Expense', value: 'expense', desc: 'Expense-tagged actuals' },
]

const QUICK_RANGES = [
  {
    label: 'This Month',
    get: () => {
      const n = new Date()
      return {
        from: new Date(n.getFullYear(), n.getMonth(), 1)
          .toISOString()
          .split('T')[0],
        to: new Date(n.getFullYear(), n.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0],
      }
    },
  },
  {
    label: 'Last Month',
    get: () => {
      const n = new Date()
      return {
        from: new Date(n.getFullYear(), n.getMonth() - 1, 1)
          .toISOString()
          .split('T')[0],
        to: new Date(n.getFullYear(), n.getMonth(), 0)
          .toISOString()
          .split('T')[0],
      }
    },
  },
  {
    label: '3 Months',
    get: () => {
      const n = new Date()
      return {
        from: new Date(n.getFullYear(), n.getMonth() - 2, 1)
          .toISOString()
          .split('T')[0],
        to: new Date(n.getFullYear(), n.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0],
      }
    },
  },
  {
    label: 'This Year',
    get: () => {
      const y = new Date().getFullYear()
      return { from: `${y}-01-01`, to: `${y}-12-31` }
    },
  },
]

const PAGE_SIZE_FLAT = 10
const PAGE_SIZE_GROUPED = 200

interface FilterState {
  types: TxnTypeFilter[]
  dateFrom: string
  dateTo: string
  groupBy: GroupBy
  filterContact: string
  filterAccount: string
}

function countFilters(s: FilterState) {
  let n = 0
  if (s.types.length > 0) n++
  if (s.dateFrom) n++
  if (s.dateTo) n++
  if (s.groupBy) n++
  if (s.filterContact) n++
  if (s.filterAccount) n++
  return n
}

export function TransactionsPage() {
  const router = useRouter()
  const { setPageTitle } = useUIStore()
  useEffect(() => {
    setPageTitle('Transactions')
  }, [setPageTitle])

  const searchParams = useSearchParams()
  const urlContactId = searchParams.get('contact')
  const urlAccountId = searchParams.get('account')

  // applied filters
  const [selectedTypes, setSelectedTypes] = useState<TxnTypeFilter[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('')
  const [filterContact, setFilterContact] = useState<string>(urlContactId ?? '')
  const [filterAccount, setFilterAccount] = useState<string>(urlAccountId ?? '')
  const [page, setPage] = useState(1)

  // filter sheet staged
  const [filterOpen, setFilterOpen] = useState(false)
  const [stagedTypes, setStagedTypes] = useState<TxnTypeFilter[]>([])
  const [stagedDateFrom, setStagedDateFrom] = useState('')
  const [stagedDateTo, setStagedDateTo] = useState('')
  const [stagedGroupBy, setStagedGroupBy] = useState<GroupBy>('')
  const [stagedContact, setStagedContact] = useState('')
  const [stagedAccount, setStagedAccount] = useState('')
  const [stagedQuickRange, setStagedQuickRange] = useState('')

  // edit / delete
  const [editTxn, setEditTxn] = useState<FinancialTransaction | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)

  // print modals
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [listPrintOpen, setListPrintOpen] = useState(false)
  const [groupPrint, setGroupPrint] = useState<{
    title: string
    txns: FinancialTransaction[]
  } | null>(null)

  const openFilter = () => {
    setStagedTypes([...selectedTypes])
    setStagedDateFrom(dateFrom)
    setStagedDateTo(dateTo)
    setStagedGroupBy(groupBy)
    setStagedContact(filterContact)
    setStagedAccount(filterAccount)
    setStagedQuickRange('')
    setFilterOpen(true)
  }

  const applyFilters = () => {
    setSelectedTypes(stagedTypes)
    setDateFrom(stagedDateFrom)
    setDateTo(stagedDateTo)
    setGroupBy(stagedGroupBy)
    setFilterContact(stagedContact)
    setFilterAccount(stagedAccount)
    setPage(1)
    setFilterOpen(false)
  }

  const clearStaged = () => {
    setStagedTypes([])
    setStagedDateFrom('')
    setStagedDateTo('')
    setStagedGroupBy('')
    setStagedContact('')
    setStagedAccount('')
    setStagedQuickRange('')
  }

  const resetAll = () => {
    setSelectedTypes([])
    setDateFrom('')
    setDateTo('')
    setGroupBy('')
    setFilterContact('')
    setFilterAccount('')
    setPage(1)
  }

  const toggleStagedType = (t: TxnTypeFilter) => {
    setStagedTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t],
    )
  }

  const applyQuickRange = (r: (typeof QUICK_RANGES)[number]) => {
    const { from, to } = r.get()
    setStagedDateFrom(from)
    setStagedDateTo(to)
    setStagedQuickRange(r.label)
  }

  const isGrouped = groupBy !== ''

  const effectiveContact = filterContact ? Number(filterContact) : undefined
  const effectiveAccount = filterAccount ? Number(filterAccount) : undefined

  const queryParams = useMemo(() => {
    const p: Record<string, unknown> = {
      contact:   effectiveContact,
      account:   effectiveAccount,
      date_from: dateFrom || undefined,
      date_to:   dateTo   || undefined,
      ordering:  '-date',
      page_size: isGrouped ? PAGE_SIZE_GROUPED : PAGE_SIZE_FLAT,
      page:      isGrouped ? 1 : page,
    }

    // No types selected → no filter, backend returns all
    if (selectedTypes.length === 0) return p

    // Send comma-separated → backend ?types= uses OR Q() logic per token
    // 'expense' → actual + document__type=expense
    // 'actual'  → actual excluding expense docs
    // 'record'  → record type
    // 'contra'  → contra type
    p.types = selectedTypes.join(',')

    return p
  }, [effectiveContact, effectiveAccount, dateFrom, dateTo, selectedTypes, page, isGrouped])

  const { data, isLoading } = useTransactions(queryParams)
  const { data: urlContactData } = useContact(
    urlContactId ? Number(urlContactId) : undefined
  )
  const { data: contactsData } = useContacts()
  const { data: allAccountsData } = useAccounts({ is_active: true })
  const deleteMutation = useDeleteTransaction(
    urlContactId ? Number(urlContactId) : undefined  // was urlContactNum
  )

  const txns = data?.results ?? []
  const totalCount = data?.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE_FLAT)
  const allContacts = contactsData?.results ?? []
  const allAccounts = allAccountsData?.results ?? []

  const accountMap = useMemo(
    () => Object.fromEntries(allAccounts.map(a => [a.id.toString(), a.name])),
    [allAccounts],
  )

  const contactOptions = allContacts.map(c => ({
    value: String(c.id),
    label: c.company_name || c.contact_name,
    sublabel: c.company_name ? c.contact_name : undefined,
  }))

  const accountOptions = allAccounts.map(a => ({
    value: String(a.id),
    label: a.name,
    sublabel: a.type,
    meta: fmtAmount(a.current_balance),
  }))

  const resolvedContact = filterContact
    ? allContacts.find(c => String(c.id) === filterContact)
    : null
  const resolvedContactName = resolvedContact
    ? resolvedContact.company_name || resolvedContact.contact_name
    : filterContact
    ? `Contact #${filterContact}`
    : ''

  const resolvedAccount = filterAccount
    ? allAccounts.find(a => String(a.id) === filterAccount)
    : null
  const resolvedAccountName =
    resolvedAccount?.name ?? (filterAccount ? `Account #${filterAccount}` : '')

  const urlContactDisplayName = urlContactData
    ? urlContactData.company_name || urlContactData.contact_name
    : urlContactId
    ? `Contact #${urlContactId}`
    : ''

  const ledgerTitle =
    resolvedContactName ||
    resolvedAccountName ||
    urlContactDisplayName ||
    (urlAccountId
      ? allAccounts.find(a => a.id === Number(urlAccountId))?.name ??
        `Account #${urlAccountId}`
      : '') ||
    'All Transactions'

  const hasLedgerContext =
    !!(filterContact || filterAccount || urlContactId || urlAccountId)

  const activeFilterCount = countFilters({
    types: selectedTypes,
    dateFrom,
    dateTo,
    groupBy,
    filterContact,
    filterAccount,
  })
  const stagedFilterCount = countFilters({
    types: stagedTypes,
    dateFrom: stagedDateFrom,
    dateTo: stagedDateTo,
    groupBy: stagedGroupBy,
    filterContact: stagedContact,
    filterAccount: stagedAccount,
  })

  const dateRangeInvalid =
    !!stagedDateFrom &&
    !!stagedDateTo &&
    new Date(stagedDateFrom) > new Date(stagedDateTo)

  const grouped = useMemo(() => {
    if (!isGrouped || txns.length === 0) return null
    const map = new Map<string, FinancialTransaction[]>()
    txns.forEach(t => {
      const key =
        groupBy === 'contact'
          ? t.contact_name || 'No Contact'
          : accountMap[t.payment_account?.toString() ?? ''] ??
            (t.payment_account ? `Account #${t.payment_account}` : 'No Account')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    })
    return Array.from(map.entries()).map(([label, items]) => ({
      label,
      items,
      net: items.reduce((s, t) => s + Number(t.amount), 0),
    }))
  }, [txns, isGrouped, groupBy, accountMap])

  const handleEdit = (txn: FinancialTransaction) => {
    if (txn.type === 'record') {
      if (txn.document) {
        router.push(`/documents/${txn.document}`)
      } else {
        toast.info('No linked document to edit')
      }
      return
    }
    if (txn.type === 'contra') {
      toast.info('Transfer transactions are managed via the Transfers page')
      return
    }
    setEditTxn(txn)
  }

  const handleDeletePrompt = (id: number) => {
    const found = txns.find(t => t.id === id)
    if (!found) return
    if (found.type === 'record') {
      toast.error(
        'Record transactions can only be deleted via document deletion.',
      )
      return
    }
    if (found.type === 'contra') {
      toast.error('Transfer transactions cannot be deleted individually.')
      return
    }
    setEditTxn(found)
    setConfirmDel(true)
  }

  const handleConfirmDelete = async () => {
    if (!editTxn) return
    try {
      await deleteMutation.mutateAsync(editTxn.id)
      toast.success('Transaction deleted')
      setConfirmDel(false)
      setEditTxn(null)
    } catch {
      toast.error('Failed to delete transaction')
    }
  }

  return (
    <div className="pb-6">
      {/* header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div>
          <h2 className="text-sm font-semibold">Transactions</h2>
          {!isLoading && totalCount > 0 && !isGrouped && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {totalCount} total
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasLedgerContext && txns.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLedgerOpen(true)}
              className="h-8 gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Ledger
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setListPrintOpen(true)}
            disabled={txns.length === 0}
            className="h-8 gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            Print PDF
          </Button>

          <button
            onClick={openFilter}
            className={cn(
              'relative flex items-center justify-center h-8 w-8 rounded-xl border transition-colors shrink-0',
              activeFilterCount > 0
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* active filter pills */}
      {activeFilterCount > 0 && (
        <div className="mx-4 mb-2 flex items-center gap-1.5 flex-wrap">
          {selectedTypes.map(t => (
            <span
              key={t}
              className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg"
            >
              {TYPE_OPTIONS.find(o => o.value === t)?.label ?? t}
              <button
                onClick={() =>
                  setSelectedTypes(prev => prev.filter(x => x !== t))
                }
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {filterContact && (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg">
              👤 {resolvedContactName}
              <button onClick={() => setFilterContact('')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filterAccount && (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg">
            🏦 {resolvedAccountName}
              <button onClick={() => setFilterAccount('')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {groupBy && (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg">
              {groupBy === 'contact' ? '👥 By Contact' : '🏦 By Account'}
              <button onClick={() => setGroupBy('')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {dateFrom && (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg">
              From {fmtDate(dateFrom)}
              <button onClick={() => setDateFrom('')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {dateTo && (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg">
              To {fmtDate(dateTo)}
              <button onClick={() => setDateTo('')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            onClick={resetAll}
            className="text-[11px] font-bold text-muted-foreground underline underline-offset-2 hover:text-destructive ml-auto"
          >
            Clear all
          </button>
        </div>
      )}

      {/* URL context banner */}
      {(urlContactId || urlAccountId) && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary flex items-center justify-center gap-1.5 flex-wrap">
          {urlContactId && (
            <span className="flex items-center gap-1">
              <span className="opacity-60">Contact:</span>
              {urlContactData ? (
                <span className="font-bold">{urlContactDisplayName}</span>
              ) : (
                <span className="inline-block w-24 h-3.5 bg-primary/20 rounded animate-pulse" />
              )}
            </span>
          )}
          {urlContactId && urlAccountId && (
            <span className="opacity-40">·</span>
          )}
          {urlAccountId && (
            <span className="flex items-center gap-1">
              <span className="opacity-60">Account:</span>
              <span className="font-bold">
                {allAccounts.find(a => a.id === Number(urlAccountId))?.name ??
                  `#${urlAccountId}`}
              </span>
            </span>
          )}
        </div>
      )}

      {/* main list */}
      <div className="px-4 mt-1">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl w-full" />
            ))}
          </div>
        ) : txns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <span className="text-xl">📄</span>
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              No transactions found
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-50">
              Try changing your filters or checking a different account.
            </p>
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-xs"
                onClick={resetAll}
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : isGrouped && grouped ? (
          <div className="space-y-5">
            {grouped.map(group => (
              <div key={group.label}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {groupBy === 'contact' ? (
                      <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <Landmark className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-xs font-bold truncate">
                      {group.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      ({group.items.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        'text-xs font-black tabular-nums',
                        group.net > 0
                          ? 'text-red-600'
                          : group.net < 0
                          ? 'text-emerald-600'
                          : 'text-muted-foreground',
                      )}
                    >
                      {group.net >= 0 ? '+' : ''}
                      {fmtAmount(group.net)}
                    </span>
                    <button
                      onClick={() =>
                        setGroupPrint({
                          title: group.label,
                          txns: group.items,
                        })
                      }
                      className="p-1.5 rounded-lg border bg-background hover:bg-muted/60 transition-colors"
                      title="Print ledger for this group"
                    >
                      <Printer className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {group.items.map(txn => (
                    <TransactionCard
                      key={txn.id}
                      txn={txn}
                      showContact={groupBy === 'account'}
                      onEdit={() => handleEdit(txn)}
                      onDelete={handleDeletePrompt}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              {txns.map(txn => (
                <TransactionCard
                  key={txn.id}
                  txn={txn}
                  showContact={!urlContactId && !filterContact}
                  onEdit={() => handleEdit(txn)}
                  onDelete={handleDeletePrompt}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-9 gap-1.5"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </Button>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-bold tabular-nums">
                    {page} / {totalPages}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {(page - 1) * PAGE_SIZE_FLAT + 1}–
                    {Math.min(page * PAGE_SIZE_FLAT, totalCount)} of {totalCount}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-9 gap-1.5"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* edit sheet */}
      <EditTransactionSheet
        txn={editTxn}
        open={!!editTxn && !confirmDel}
        onClose={() => setEditTxn(null)}
        contactId={urlContactId ? Number(urlContactId) : undefined} 
        onDelete={() => setConfirmDel(true)}
      />

      {/* delete confirm */}
      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black">
              Delete Transaction?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2.5 text-sm font-medium pt-2">
                <p>
                  Permanently delete this transaction of{' '}
                  <strong className="text-foreground">
                    {editTxn
                      ? fmtAmount(Math.abs(Number(editTxn.amount)))
                      : ''}
                  </strong>
                  {editTxn ? ` on ${fmtDate(editTxn.date)}` : ''}.
                </p>
                <p className="text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-100 dark:border-amber-800 leading-tight">
                  ⚠️ The account balance will be reversed automatically.
                </p>
                {editTxn?.document && !editTxn.is_document_deleted && (
                  <p className="text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-100 dark:border-amber-800 leading-tight">
                    ⚠️ Linked to a document. The document balance will become
                    unpaid again.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-11 rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="h-11 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* list (table) print */}
      <PrintSheet
        open={listPrintOpen}
        onClose={() => setListPrintOpen(false)}
        title="Transactions"
        view="list"
        queryParams={queryParams}
      />

      {/* overall ledger print */}
      <PrintSheet
        open={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        title={`Ledger — ${ledgerTitle}`}
        view="ledger"
        queryParams={queryParams}
      />

      {/* per-group ledger print */}
      <PrintSheet
        open={!!groupPrint}
        onClose={() => setGroupPrint(null)}
        title={groupPrint ? `Ledger — ${groupPrint.title}` : 'Ledger'}
        view="ledger"
        queryParams={{
          ...queryParams,
          ...(groupBy === 'contact'
            ? { contact: groupPrint?.txns[0]?.contact }
            : { account: groupPrint?.txns[0]?.payment_account }),
          page_size: PAGE_SIZE_GROUPED,
          page: 1,
        }}
      />

      {/* filter sheet */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl px-4 pb-10 max-h-[92vh] overflow-y-auto"
        >
          <SheetHeader className="mb-5">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-left flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filter Transactions
              </SheetTitle>
              <button
                onClick={clearStaged}
                className="text-xs font-bold text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors"
              >
                Clear all
              </button>
            </div>
          </SheetHeader>

          <div className="space-y-6">
            {/* type */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Transaction Type
                </p>
                {stagedTypes.length > 0 && (
                  <button
                    onClick={() => setStagedTypes([])}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-destructive underline underline-offset-2"
                  >
                    Deselect all ({stagedTypes.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map(opt => {
                  const isSelected = stagedTypes.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleStagedType(opt.value)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
                      )}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 shrink-0" />
                      )}
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              {stagedTypes.length === 0 && (
                <p className="text-[10px] text-muted-foreground mt-2 ml-1">
                  No type selected — showing all types
                </p>
              )}
            </div>

            <Separator />

            {/* group by */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Group By
              </p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { label: 'None', value: '' as GroupBy, icon: X },
                  {
                    label: 'Contact',
                    value: 'contact' as GroupBy,
                    icon: Users,
                  },
                  {
                    label: 'Account',
                    value: 'account' as GroupBy,
                    icon: Landmark,
                  },
                ] as const).map(opt => {
                  const Icon = opt.icon
                  const isSelected = stagedGroupBy === opt.value
                  return (
                    <button
                      key={opt.label}
                      onClick={() => setStagedGroupBy(opt.value)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-semibold border transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              {stagedGroupBy && (
                <p className="text-[10px] text-muted-foreground mt-2 ml-1">
                  Loads up to {PAGE_SIZE_GROUPED} transactions. Pagination
                  disabled in grouped view.
                </p>
              )}
            </div>

            <Separator />

            {/* contact filter */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Contact
              </p>
              <SearchableSelect
                options={contactOptions}
                value={stagedContact}
                onChange={setStagedContact}
                placeholder="All contacts"
                title="Filter by Contact"
                searchPlaceholder="Search contacts..."
                clearable
              />
              {stagedContact && (
                <p className="text-[10px] text-muted-foreground mt-2 ml-1">
                  Showing transactions for this contact only
                </p>
              )}
            </div>

            <Separator />

            {/* account filter */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Payment Account
              </p>
              <SearchableSelect
                options={accountOptions}
                value={stagedAccount}
                onChange={setStagedAccount}
                placeholder="All accounts"
                title="Filter by Account"
                searchPlaceholder="Search accounts..."
                clearable
              />
              {stagedAccount && (
                <p className="text-[10px] text-muted-foreground mt-2 ml-1">
                  Showing transactions through this account only
                </p>
              )}
            </div>

            <Separator />

            {/* date range */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Date Range
              </p>

              <div className="flex gap-2 flex-wrap mb-3">
                {QUICK_RANGES.map(r => (
                  <button
                    key={r.label}
                    onClick={() => applyQuickRange(r)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all',
                      stagedQuickRange === r.label
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
                    )}
                  >
                    <CalendarDays className="h-3 w-3" />
                    {r.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    From
                  </label>
                  <input
                    type="date"
                    value={stagedDateFrom}
                    onChange={e => {
                      setStagedDateFrom(e.target.value)
                      setStagedQuickRange('')
                    }}
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    To
                  </label>
                  <input
                    type="date"
                    value={stagedDateTo}
                    onChange={e => {
                      setStagedDateTo(e.target.value)
                      setStagedQuickRange('')
                    }}
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {dateRangeInvalid && (
                <p className="text-[11px] text-destructive mt-2 ml-1 font-semibold">
                  ⚠️ "From" date is after "To" date
                </p>
              )}

              {(stagedDateFrom || stagedDateTo) && !dateRangeInvalid && (
                <button
                  onClick={() => {
                    setStagedDateFrom('')
                    setStagedDateTo('')
                    setStagedQuickRange('')
                  }}
                  className="mt-2 text-[11px] font-semibold text-muted-foreground hover:text-destructive underline underline-offset-2"
                >
                  Clear dates
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-2xl font-semibold"
              onClick={() => setFilterOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 rounded-2xl font-bold shadow-md shadow-primary/20"
              onClick={applyFilters}
              disabled={dateRangeInvalid}
            >
              Apply
              {stagedFilterCount > 0 && (
                <span className="ml-2 bg-primary-foreground/20 text-primary-foreground text-[10px] font-black px-1.5 py-0.5 rounded-md">
                  {stagedFilterCount}
                </span>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
