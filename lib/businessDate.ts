/** Date-only inputs follow the accounting backend's business timezone. */
export function businessDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function businessMonthRange(offset = 0) {
  const [year, month] = businessDate().split('-').map(Number)
  return {
    from: new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10),
    to: new Date(Date.UTC(year, month + offset, 0)).toISOString().slice(0, 10),
  }
}
