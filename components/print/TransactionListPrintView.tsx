// components/print/TransactionListPrintView.tsx
import type { FinancialTransaction } from '@/models/transaction'
import { formatDate, formatAmount, cfColorStyle } from '@/lib/formatters'

interface TransactionListPrintViewProps {
  transactions: FinancialTransaction[]
  // Label maps resolved by parent from stores — avoids contact_name hallucination
  contactMap:  Record<number, string>   // contact id → display name
  accountMap:  Record<number, string>   // payment_account id → name
  filters: {
    dateFrom?: string
    dateTo?:   string
    contact?:  string   // label for display
    account?:  string   // label for display
    type?:     string
  }
}

export function TransactionListPrintView({
  transactions,
  contactMap,
  accountMap,
  filters,
}: TransactionListPrintViewProps) {
  const filterParts: string[] = []
  if (filters.dateFrom || filters.dateTo)
    filterParts.push(`Date: ${filters.dateFrom ?? '—'} → ${filters.dateTo ?? '—'}`)
  if (filters.contact) filterParts.push(`Contact: ${filters.contact}`)
  if (filters.account) filterParts.push(`Account: ${filters.account}`)
  if (filters.type)    filterParts.push(`Type: ${filters.type}`)

  const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)

  return (
    <div>
      <h1 style={{ fontSize: 16, marginBottom: 4 }}>Transaction Report — List View</h1>
      {filterParts.length > 0 && (
        <p style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
          {filterParts.join('  ·  ')}
        </p>
      )}
      <p style={{ fontSize: 11, color: '#666', marginBottom: 12 }}>
        Total records: {transactions.length}
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Date', 'Type', 'Contact', 'Account', 'Document', 'Notes', 'Amount'].map((h) => (
              <th
                key={h}
                style={{
                  border: '1px solid #ccc', padding: '5px 7px',
                  background: '#f5f5f5', fontSize: 11, textAlign: h === 'Amount' ? 'right' : 'left',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td style={tdStyle}>{formatDate(t.date)}</td>
              <td style={{ ...tdStyle, textTransform: 'capitalize' }}>{t.type}</td>
              <td style={tdStyle}>{t.contact ? (contactMap[t.contact] ?? `#${t.contact}`) : '—'}</td>
              <td style={tdStyle}>{t.payment_account ? (accountMap[t.payment_account] ?? `#${t.payment_account}`) : '—'}</td>
              <td style={tdStyle}>
                {t.document_type && t.document
                  ? `${t.document_type.toUpperCase()} #${t.document}`
                  : '—'}
                {t.is_document_deleted && (
                  <span style={{ color: '#f59e0b', marginLeft: 4, fontSize: 10 }}>⚠ Deleted</span>
                )}
              </td>
              <td style={tdStyle}>{t.notes ?? '—'}</td>
              <td style={{ ...tdStyle, textAlign: 'right', color: cfColorStyle(t.amount), fontWeight: 600 }}>
                {formatAmount(t.amount)}
              </td>
            </tr>
          ))}
          <tr>
            <td
              colSpan={6}
              style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, background: '#fafafa' }}
            >
              Net Total
            </td>
            <td
              style={{
                ...tdStyle, textAlign: 'right', fontWeight: 700,
                background: '#fafafa', color: cfColorStyle(String(total)),
              }}
            >
              {formatAmount(total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

const tdStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '5px 7px',
  fontSize: 11,
}
