import {
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns'

import type { ChartPoint, Transaction } from '@/server/trpc/types'

export type ViewMode = 'year' | 'month' | 'week'

export interface PeriodBounds {
  start: Date
  end: Date
}

export function getPeriodBounds(anchor: Date, mode: ViewMode): PeriodBounds {
  switch (mode) {
    case 'year':
      return { start: startOfYear(anchor), end: endOfYear(anchor) }
    case 'month':
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) }
    case 'week':
      return { start: startOfWeek(anchor), end: endOfWeek(anchor) }
  }
}

export function getChartInterval(mode: ViewMode): 'month' | 'day' {
  switch (mode) {
    case 'year':
      return 'month'
    case 'month':
    case 'week':
      return 'day'
  }
}

export function shiftPeriod(
  anchor: Date,
  mode: ViewMode,
  direction: -1 | 1,
): Date {
  switch (mode) {
    case 'year':
      return direction === 1 ? addYears(anchor, 1) : subYears(anchor, 1)
    case 'month':
      return direction === 1 ? addMonths(anchor, 1) : subMonths(anchor, 1)
    case 'week':
      return direction === 1 ? addWeeks(anchor, 1) : subWeeks(anchor, 1)
  }
}

export function getPeriodLabel(anchor: Date, mode: ViewMode): string {
  switch (mode) {
    case 'year':
      return format(anchor, 'yyyy')
    case 'month':
      return format(anchor, 'MMMM yyyy')
    case 'week': {
      const { start, end } = getPeriodBounds(anchor, 'week')
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    }
  }
}

export function isCurrentPeriod(bounds: PeriodBounds, mode: ViewMode): boolean {
  const now = new Date()
  const current = getPeriodBounds(now, mode)
  return bounds.start.getTime() === current.start.getTime()
}

export function filterTransactionsByPeriod(
  transactions: Transaction[],
  bounds: PeriodBounds,
): Transaction[] {
  return transactions.filter((t) =>
    isWithinInterval(parseISO(t.operationDate), {
      start: bounds.start,
      end: bounds.end,
    }),
  )
}

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

export function groupTransactionsByInterval(
  transactions: Transaction[],
  interval: 'month' | 'day',
  start: Date,
  end: Date,
): ChartPoint[] {
  const points: { label: string }[] = []

  if (interval === 'month') {
    for (const d of eachMonthOfInterval({ start, end })) {
      points.push({ label: format(d, 'MMM') })
    }
  } else {
    for (const d of eachDayOfInterval({ start, end })) {
      points.push({ label: format(d, 'MMM d') })
    }
  }

  const buckets = new Map<string, ChartPoint>()
  for (const { label } of points) {
    buckets.set(label, { label, spent: 0, gained: 0 })
  }

  for (const transaction of transactions) {
    const date = parseISO(transaction.operationDate)
    const label =
      interval === 'month' ? format(date, 'MMM') : format(date, 'MMM d')
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
