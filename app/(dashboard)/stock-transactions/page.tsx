import { Suspense } from 'react'
import { StockTransactionsPage } from '@/components/inventory/StockTransactionsPage'
export default function Page() { return <Suspense fallback={<p className="p-6">Loading stock history…</p>}><StockTransactionsPage /></Suspense> }
