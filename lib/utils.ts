// lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Safely parse incoming values (which could be undefined/null if API structure mismatches)
function parseAmount(amount: string | number | null | undefined): number {
  if (amount === null || amount === undefined || amount === '') return 0
  const parsed = Number(amount)
  return isNaN(parsed) ? 0 : parsed
}

// CF color — ONLY for running balance display
// Positive = we owe them = Red | Negative = they owe us = Green
export function cfColor(amount: string | number | null | undefined): string {
  const n = parseAmount(amount)
  return n >= 0 ? 'text-red-500' : 'text-green-500'
}

// CF label — always shows absolute value with ₹
export function cfLabel(amount: string | number | null | undefined): string {
  const n = parseAmount(amount)
  if (n === 0) return '₹0'
  return `₹${Math.abs(n).toLocaleString('en-IN')}`
}

// Full formatted amount with paise — for transaction rows
export function fmtAmount(amount: string | number | null | undefined): string {
  const n = parseAmount(amount)
  return `₹${n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// Short date: 12 Jan 2026
export function fmtDate(date: string): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Signed amount label for transaction rows
// Positive amount = money IN = green. Negative = money OUT = red.
export function txnAmountColor(amount: string | number | null | undefined): string {
  const n = parseAmount(amount)
  return n >= 0 ? 'text-green-600' : 'text-red-500'
}

// Signed amount label — shows + / − prefix
export function txnAmountLabel(amount: string | number | null | undefined): string {
  const n = parseAmount(amount)
  const abs = `₹${Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
  return n >= 0 ? `+${abs}` : `-${abs}`
}
