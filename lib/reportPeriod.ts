import { businessDate } from './businessDate'

export function currentFinancialYear(today = businessDate()) {
  const [year, month] = today.split('-').map(Number)
  return month >= 4 ? year : year - 1
}
export function financialYearPeriod(year: number) {
  return { date_from: `${year}-04-01`, date_to: `${year + 1}-03-31` }
}
export function monthPeriod(month: string) {
  const [year, value] = month.split('-').map(Number)
  const days = new Date(Date.UTC(year, value, 0)).getUTCDate()
  return { date_from: `${month}-01`, date_to: `${month}-${String(days).padStart(2, '0')}` }
}
