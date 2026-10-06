import type { Document } from '@/models/document'
import { DOC_TYPE_LABELS } from '@/models/document'

/** Ten-digit local numbers are Indian; international numbers need + or 00. */
export function whatsappNumber(input: string): string | null {
  const value = input.trim()
  if (!/^\+?[\d\s().-]+$/.test(value)) return null
  let digits = value.replace(/\D/g, '')
  if (value.startsWith('+')) { /* already international */ }
  else if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.length === 10) digits = `91${digits}`
  else if (!(digits.length === 12 && digits.startsWith('91'))) return null
  return /^[1-9]\d{6,14}$/.test(digits) ? digits : null
}

export function documentShareText(doc: Document) {
  const name = doc.contact_display?.name
  const lines = [name ? `Hello ${name},` : 'Hello,',
    `${DOC_TYPE_LABELS[doc.type]} #${doc.doc_id} dated ${doc.date} is ready.`]
  if (doc.type !== 'challan' && doc.total_amount !== null && Number.isFinite(Number(doc.total_amount))) {
    lines.push(`Total: ₹${Number(doc.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  }
  return lines.join('\n')
}

export function documentPdfName(doc: Document) {
  return `${doc.type.toUpperCase()}_${doc.doc_id}_${doc.date}.pdf`
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 180)
}
