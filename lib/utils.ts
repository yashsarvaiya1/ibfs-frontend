// lib/utils.ts  (add to existing file)
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// CF color — ONLY for running balance display
// Positive = we owe them = Red, Negative = they owe us = Green
export function cfColor(amount: string | number): string {
  return Number(amount) >= 0 ? 'text-red-500' : 'text-green-500'
}

export function cfLabel(amount: string | number): string {
  const n = Number(amount)
  if (n === 0) return '₹0'
  return n > 0 ? `₹${Math.abs(n).toLocaleString('en-IN')}` : `₹${Math.abs(n).toLocaleString('en-IN')}`
}

export function fmtAmount(amount: string | number): string {
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function fmtDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
