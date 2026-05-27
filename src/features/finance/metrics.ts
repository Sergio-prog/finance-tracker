import { format, parseISO, startOfMonth } from 'date-fns'

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
  const buckets = new Map<string, ChartPoint>()

  for (const transaction of transactions) {
    const date = parseISO(transaction.operationDate)
    const label = getPeriodLabel(date, period)
    const point = buckets.get(label) ?? { label, spent: 0, gained: 0 }

    if (transaction.type === 'income') {
      point.gained += transaction.amountMinor / 100
    } else {
      point.spent += transaction.amountMinor / 100
    }

    buckets.set(label, point)
  }

  return Array.from(buckets.values()).slice(0, 12).reverse()
}

function getPeriodLabel(date: Date, period: Period) {
  if (period === 'day') return format(date, 'MMM d')
  if (period === 'week') return format(date, "'W'II")
  if (period === 'year') return format(date, 'yyyy')

  return format(startOfMonth(date), 'MMM')
}
