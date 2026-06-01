import {
  format,
  parseISO,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns'

import type { ChartPoint, Period, Transaction } from '@/server/trpc/types'

export function summarizeTransactions(transactions: Transaction[]) {
  return transactions.reduce(
    (summary, transaction) => {
      if (transaction.type === 'income') {
        summary.gained += transaction.amountMinor
      } else {
        summary.spent += transaction.amountMinor
      }

      return summary
    },
    { spent: 0, gained: 0 },
  )
}

export function groupTransactions(
  transactions: Transaction[],
  period: Period,
): ChartPoint[] {
  if (transactions.length === 0) return []

  const dates = transactions.map((t) => parseISO(t.operationDate))
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

  const bucketCount =
    period === 'day' ? 14 : period === 'week' ? 12 : period === 'month' ? 12 : 5
  const bucketDates: Date[] = []

  for (let i = bucketCount - 1; i >= 0; i--) {
    if (period === 'day') bucketDates.push(subDays(maxDate, i))
    else if (period === 'week') bucketDates.push(subWeeks(maxDate, i))
    else if (period === 'month') bucketDates.push(subMonths(maxDate, i))
    else bucketDates.push(subYears(maxDate, i))
  }

  const buckets = new Map<string, ChartPoint>()
  for (const date of bucketDates) {
    const label = formatPeriodLabel(date, period)
    buckets.set(label, { label, spent: 0, gained: 0 })
  }

  for (const transaction of transactions) {
    const date = parseISO(transaction.operationDate)
    const label = formatPeriodLabel(date, period)
    const point = buckets.get(label)
    if (point) {
      if (transaction.type === 'income') {
        point.gained += transaction.amountMinor / 100
      } else {
        point.spent += transaction.amountMinor / 100
      }
    }
  }

  return Array.from(buckets.values())
}

function formatPeriodLabel(date: Date, period: Period) {
  if (period === 'day') return format(date, 'MMM d')
  if (period === 'week') return format(date, "'W'II")
  if (period === 'month') return format(date, 'MMM yyyy')
  return format(date, 'yyyy')
}
