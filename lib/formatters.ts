// lib/formatters.ts
// Shared formatting utilities used across the entire app

/**
 * Format a date string "YYYY-MM-DD" → "15 Jan 2026"
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day:   '2-digit',
      month: 'short',
      year:  'numeric',
    }).format(new Date(date))
  } catch {
    return date
  }
}

/**
 * Format a decimal string/number as Indian currency "₹1,23,456.78"
 */
export function formatAmount(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('en-IN', {
    style:                 'currency',
    currency:              'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Format a plain decimal string/number without currency symbol "1,23,456.78"
 */
export function formatNumber(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Per spec Part 2 — sign convention:
 * Positive = we owe them (red)
 * Negative = they owe us (green)
 * Returns Tailwind class string for the running CF column ONLY
 */
export function cfColorClass(amount: string | number | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount as string) : (amount ?? 0)
  if (isNaN(num as number)) return 'text-foreground'
  return (num as number) >= 0 ? 'text-red-600' : 'text-green-600'
}

/**
 * Inline style version for use inside print views (no Tailwind available)
 */
export function cfColorStyle(amount: string | number | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount as string) : (amount ?? 0)
  if (isNaN(num as number)) return '#000'
  return (num as number) >= 0 ? '#dc2626' : '#16a34a'
}

/**
 * Document type → human readable label
 */
export const DOC_TYPE_LABEL: Record<string, string> = {
  bill:               'Bill',
  invoice:            'Invoice',
  po:                 'Purchase Order',
  pi:                 'Proforma Invoice',
  quotation:          'Quotation',
  challan:            'Challan',
  cn:                 'Credit Note',
  dn:                 'Debit Note',
  cashpaymentvoucher: 'Cash Payment Voucher',
  cashreceiptvoucher: 'Cash Receipt Voucher',
  interest:           'Interest',
  expense:            'Expense',
}

export function docTypeLabel(type: string | null | undefined): string {
  if (!type) return '—'
  return DOC_TYPE_LABEL[type] ?? type
}
