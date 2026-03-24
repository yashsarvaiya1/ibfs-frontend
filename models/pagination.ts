// models/pagination.ts
import type { FinancialTransaction } from './transaction'

export interface PaginatedResponse<T> {
  count:        number
  total_pages:  number        // from IBFSPageNumberPagination (GD-03)
  current_page: number        // from IBFSPageNumberPagination (GD-03)
  page_size:    number        // active page size (GD-03)
  next:         string | null
  previous:     string | null
  results:      T[]
}

/**
 * @deprecated Backend now returns total_pages directly.
 * Use data.total_pages instead. Kept for safety during migration.
 */
export const getTotalPages = <T>(
  data: PaginatedResponse<T>,
  pageSize = 20,
): number => data.total_pages ?? Math.ceil(data.count / pageSize)

export const hasNextPage = <T>(data: PaginatedResponse<T>): boolean =>
  data.next !== null

export const hasPrevPage = <T>(data: PaginatedResponse<T>): boolean =>
  data.previous !== null

// ── Ledger response — contact ledger (shared/views.py ContactViewSet.ledger) ──
// Extends paginated response with opening_balance_at (TV-05)
export interface LedgerResponse extends PaginatedResponse<FinancialTransaction> {
  /**
   * TV-05: CF just before the first transaction in the filtered window.
   * = contact.opening_balance + sum of all non-expense txns before date_from.
   * Use this as the starting point for the running balance column.
   */
  opening_balance_at: string
}

// ── Account transactions response (shared/views.py PaymentAccountViewSet.transactions) ──
export interface AccountTransactionsResponse extends PaginatedResponse<FinancialTransaction> {
  /**
   * Account balance before the filtered period starts.
   * Use as "Balance B/F" row in account statements.
   */
  balance_before_period: string
}
