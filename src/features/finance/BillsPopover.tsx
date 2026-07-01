import { differenceInDays, format } from 'date-fns'
import { Bell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatMoney } from './format'
import type { Subscription } from '@/server/trpc/types'

type UpcomingBill = Pick<
  Subscription,
  'id' | 'name' | 'amountMinor' | 'currency' | 'nextChargeDate' | 'billingFrequency' | 'status'
>

const DUE_SOON_DAYS = 7
const HORIZON_DAYS = 30

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function getUpcomingBills(bills: UpcomingBill[], daysAhead: number) {
  const today = startOfToday()
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + daysAhead)

  return bills
    .filter((sub) => {
      if (sub.status !== 'active') return false
      const charge = new Date(sub.nextChargeDate)
      charge.setHours(0, 0, 0, 0)
      return charge >= today && charge < horizon
    })
    .sort(
      (a, b) =>
        new Date(a.nextChargeDate).getTime() -
        new Date(b.nextChargeDate).getTime(),
    )
}

function daysRemainingLabel(nextChargeDate: string) {
  const charge = new Date(nextChargeDate)
  charge.setHours(0, 0, 0, 0)
  const days = differenceInDays(charge, startOfToday())
  if (days <= 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `in ${days} days`
}

function BillRow({ bill }: { bill: UpcomingBill }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{bill.name}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(bill.nextChargeDate), 'MMM d')} ·{' '}
          {daysRemainingLabel(bill.nextChargeDate)}
        </p>
      </div>
      <span className="shrink-0 font-medium tabular-nums">
        {formatMoney(bill.amountMinor, bill.currency)}
      </span>
    </li>
  )
}

export function BillsPopover({
  subscriptions,
}: {
  subscriptions: UpcomingBill[]
}) {
  const dueSoon = getUpcomingBills(subscriptions, DUE_SOON_DAYS)
  const upcoming = getUpcomingBills(subscriptions, HORIZON_DAYS).filter(
    (bill) => !dueSoon.some((due) => due.id === bill.id),
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell />
          {dueSoon.length > 0 ? (
            <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {dueSoon.length}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Upcoming bills</PopoverTitle>
        </PopoverHeader>
        {dueSoon.length === 0 && upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming bills</p>
        ) : (
          <div className="flex flex-col gap-4">
            {dueSoon.length > 0 ? (
              <section className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Due within {DUE_SOON_DAYS} days
                </p>
                <ul className="flex flex-col gap-2">
                  {dueSoon.map((bill) => (
                    <BillRow key={bill.id} bill={bill} />
                  ))}
                </ul>
              </section>
            ) : null}
            {upcoming.length > 0 ? (
              <section className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Later this month
                </p>
                <ul className="flex flex-col gap-2">
                  {upcoming.map((bill) => (
                    <BillRow key={bill.id} bill={bill} />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
