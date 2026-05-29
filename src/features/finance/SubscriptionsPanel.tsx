import {
  CalendarClock,
  CreditCard,
  MoreHorizontal,
  Repeat2,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { itemMotion, listMotion, pageMotion } from './animations'
import { formatMoney } from './format'
import { SubscriptionDialog } from './SubscriptionDialog'
import type {
  BillingFrequency,
  Category,
  OperationType,
  Subscription,
} from '@/server/trpc/types'

type SubscriptionsPanelProps = {
  categories: Category[]
  subscriptions: Subscription[]
  onCreate: (input: {
    name: string
    categoryId?: string
    amount: number
    currency: string
    nextChargeDate: string
    billingFrequency: BillingFrequency
    autoCreateTransactions: boolean
    notes?: string
  }) => Promise<void>
  onCreateCategory?: (input: {
    name: string
    icon: string
    type: OperationType
    color?: string
  }) => Promise<Category>
  onEdit?: (subscription: Subscription) => void
  onDelete?: (id: string) => Promise<void>
  editingSub?: Subscription | null
  onUpdate?: (input: {
    id: string
    name?: string
    categoryId?: string
    amount?: number
    currency?: string
    nextChargeDate?: string
    billingFrequency?: BillingFrequency
    autoCreateTransactions?: boolean
    notes?: string
  }) => Promise<void>
  onCloseDialog?: () => void
}

export function SubscriptionsPanel({
  categories,
  subscriptions,
  onCreate,
  onCreateCategory,
  onEdit,
  onDelete,
  editingSub,
  onUpdate,
  onCloseDialog,
}: SubscriptionsPanelProps) {
  const monthly = useMemo(
    () =>
      subscriptions
        .filter((s) => s.status === 'active' && s.billingFrequency === 'monthly')
        .reduce((sum, s) => sum + s.amountMinor, 0),
    [subscriptions],
  )
  const yearly = useMemo(
    () =>
      subscriptions
        .filter((s) => s.status === 'active' && s.billingFrequency === 'yearly')
        .reduce((sum, s) => sum + s.amountMinor, 0),
    [subscriptions],
  )
  const monthlySubs = useMemo(
    () => subscriptions.filter((s) => s.billingFrequency === 'monthly'),
    [subscriptions],
  )
  const yearlySubs = useMemo(
    () => subscriptions.filter((s) => s.billingFrequency === 'yearly'),
    [subscriptions],
  )
  const total = subscriptions.length

  return (
    <motion.section className="grid gap-6" {...pageMotion}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'service' : 'services'}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <Metric
              label="Monthly"
              value={formatMoney(monthly, 'USD')}
            />
            <Metric
              label="Yearly"
              value={formatMoney(yearly, 'USD')}
            />
          </div>
        </div>
        <SubscriptionDialog
          categories={categories}
          onCreate={onCreate}
          onCreateCategory={onCreateCategory}
          initial={editingSub ?? undefined}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={onCloseDialog}
        />
      </div>

      <motion.div
        className="grid content-start gap-1"
        variants={listMotion}
        initial="hidden"
        animate="show"
      >
        {monthlySubs.length > 0 ? (
          <>
            <p className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Monthly
            </p>
            {monthlySubs.map((subscription, index) => (
              <SubscriptionItem
                key={subscription.id}
                subscription={subscription}
                index={index}
                total={monthlySubs.length}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </>
        ) : null}

        {yearlySubs.length > 0 ? (
          <>
            <p className="mt-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Yearly
            </p>
            {yearlySubs.map((subscription, index) => (
              <SubscriptionItem
                key={subscription.id}
                subscription={subscription}
                index={index}
                total={yearlySubs.length}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </>
        ) : null}

        {subscriptions.length === 0 ? (
          <motion.div
            className="grid min-h-52 place-items-center rounded-md border border-dashed bg-muted/20 p-6 text-center"
            variants={itemMotion}
          >
            <div className="grid max-w-xs gap-3 justify-items-center">
              <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                <CreditCard className="size-5" />
              </div>
              <div>
                <p className="font-medium">There is no subscriptions yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add services like music, AI tools, or hosting to track monthly
                  spend.
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </motion.div>
    </motion.section>
  )
}

function SubscriptionItem({
  subscription,
  index,
  total,
  onEdit,
  onDelete,
}: {
  subscription: Subscription
  index: number
  total: number
  onEdit?: (s: Subscription) => void
  onDelete?: (id: string) => Promise<void>
}) {
  return (
    <motion.div variants={itemMotion} layout>
      <div className="group flex items-center gap-1 rounded-md px-2 py-3 transition-colors hover:bg-muted/30">
        <button
          type="button"
          className="flex-1 cursor-pointer text-left"
          onClick={() => onEdit?.(subscription)}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">{subscription.name}</p>
                <Badge
                  variant={
                    subscription.status === 'active' ? 'default' : 'outline'
                  }
                >
                  {subscription.status}
                </Badge>
              </div>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <CalendarClock className="size-3.5" />
                Next charge {subscription.nextChargeDate}
              </p>
            </div>
            <p className="shrink-0 text-right font-semibold">
              {formatMoney(subscription.amountMinor, subscription.currency)}
            </p>
          </div>
        </button>
        {onDelete ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
                aria-label="More options"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-40 p-1">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
                onClick={() => onDelete(subscription.id)}
              >
                Delete
              </button>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
      {index < total - 1 ? <Separator /> : null}
    </motion.div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      className="min-w-0 rounded-md border bg-card px-3 py-2"
      whileTap={{ scale: 0.98 }}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-lg font-semibold tabular-nums sm:text-xl">
        {value}
      </p>
    </motion.div>
  )
}
