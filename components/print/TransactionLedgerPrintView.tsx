// components/print/TransactionLedgerPrintView.tsx
import type { FinancialTransaction } from '@/models/transaction'
import { formatDate, formatAmount, cfColorStyle } from '@/lib/formatters'

interface TransactionLedgerPrintViewProps {
  transactions: FinancialTransaction[]
  contactMap:     Record<number, string>   // id → display name
  accountMap:     Record<number, string>   // id → name
  // opening balance per contact id — from contact store
  openingBalances: Record<number, string>
  filters: {
    dateFrom?: string
    dateTo?:   string
    contact?:  string
    account?:  string
    type?:     string
  }
}

export function TransactionLedgerPrintView({
  transactions,
  contactMap,
  accountMap,
  openingBalances,
  filters,
}: TransactionLedgerPrintViewProps) {
  const filterParts: string[] = []
  if (filters.dateFrom || filters.dateTo)
    filterParts.push(`Date: ${filters.dateFrom ?? '—'} → ${filters.dateTo ?? '—'}`)
  if (filters.contact) filterParts.push(`Contact: ${filters.contact}`)
  if (filters.account) filterParts.push(`Account: ${filters.account}`)
  if (filters.type)    filterParts.push(`Type: ${filters.type}`)

  // Group by contact id (null → key -1 = "No Contact / Direct")
  const groups = new Map<number | -1, FinancialTransaction[]>()
  for (const t of transactions) {
    const key = t.contact ?? -1
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(t)
  }

  return (
    <div>
      <h1 style={{ fontSize: 16, marginBottom: 4 }}>Transaction Report — Ledger View</h1>
      {filterParts.length > 0 && (
        <p style={{ fontSize: 11, color: '#666', marginBottom: 12 }}>
          {filterParts.join('  ·  ')}
        </p>
      )}

      {Array.from(groups.entries()).map(([contactId, txns]) => {
        const contactLabel =
          contactId === -1 ? 'No Contact / Direct' : (contactMap[contactId] ?? `Contact #${contactId}`)
        const openingBal = contactId !== -1 ? parseFloat(openingBalances[contactId] ?? '0') : 0

        let runningCf = openingBal
        const rows = txns.map((t) => {
          runningCf += parseFloat(t.amount)
          return { t, cf: runningCf }
        })

        return (
          <div key={contactId} style={{ marginBottom: 24 }}>
            {/* Section header */}
            <div style={{
              background: '#f0f0f0', padding: '6px 8px',
              fontWeight: 700, fontSize: 12, marginTop: 12,
            }}>
              {contactLabel}
              {openingBal !== 0 && (
                <span style={{ fontWeight: 400, marginLeft: 12, fontSize: 11 }}>
                  Opening: {formatAmount(openingBal)}
                </span>
              )}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Type', 'Document', 'Account', 'Notes', 'Amount', 'Running CF'].map((h) => (
                    <th
                      key={h}
                      style={{
                        border: '1px solid #ccc', padding: '5px 7px',
                        background: '#f5f5f5', fontSize: 11,
                        textAlign: ['Amount', 'Running CF'].includes(h) ? 'right' : 'left',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Opening balance row */}
                {openingBal !== 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...tdStyle, color: '#888', fontStyle: 'italic' }}>
                      Opening Balance
                    </td>
                    <td style={tdStyle} />
                    <td style={{ ...tdStyle, textAlign: 'right', color: cfColorStyle(openingBal), fontWeight: 600 }}>
                      {formatAmount(openingBal)}
                    </td>
                  </tr>
                )}

                {rows.map(({ t, cf }) => (
                  <tr key={t.id}>
                    <td style={tdStyle}>{formatDate(t.date)}</td>
                    <td style={{ ...tdStyle, textTransform: 'capitalize' }}>{t.type}</td>
                    <td style={tdStyle}>
                      {t.document_type && t.document
                        ? `${t.document_type.toUpperCase()} #${t.document}`
                        : '—'}
                      {t.is_document_deleted && (
                        <span style={{ color: '#f59e0b', marginLeft: 4, fontSize: 10 }}>⚠</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {t.payment_account ? (accountMap[t.payment_account] ?? `#${t.payment_account}`) : '—'}
                    </td>
                    <td style={tdStyle}>{t.notes ?? '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: cfColorStyle(t.amount), fontWeight: 500 }}>
                      {formatAmount(t.amount)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: cfColorStyle(cf), fontWeight: 700 }}>
                      {formatAmount(cf)}
                    </td>
                  </tr>
                ))}

                {/* Closing row */}
                <tr>
                  <td
                    colSpan={6}
                    style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, background: '#fafafa' }}
                  >
                    Closing Balance
                  </td>
                  <td
                    style={{
                      ...tdStyle, textAlign: 'right', fontWeight: 700,
                      background: '#fafafa',
                      color: cfColorStyle(rows.at(-1)?.cf ?? openingBal),
                    }}
                  >
                    {formatAmount(rows.at(-1)?.cf ?? openingBal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

const tdStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '5px 7px',
  fontSize: 11,
}
