import { format } from 'date-fns'
import { CalendarClock, ChevronRight, CreditCard, Repeat2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { itemMotion, listMotion, pageMotion } from './animations'
import { currencies } from './currency'
import { formatMoney } from './format'
import type { Category, Subscription } from '@/server/trpc/types'

type SubscriptionsPanelProps = {
  categories: Category[]
  subscriptions: Subscription[]
  onCreate: (input: {
    name: string
    categoryId?: string
    amount: number
    currency: string
    billingDay: number
    nextChargeDate: string
    autoCreateTransactions: boolean
    notes?: string
  }) => Promise<void>
}

export function SubscriptionsPanel({
  categories,
  subscriptions,
  onCreate,
}: SubscriptionsPanelProps) {
  const [autoCreate, setAutoCreate] = useState(true)
  const [currency, setCurrency] = useState('USD')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [nextChargeDate, setNextChargeDate] = useState<Date | undefined>()
  const monthly = useMemo(
    () =>
      subscriptions
        .filter((subscription) => subscription.status === 'active')
        .reduce((sum, subscription) => sum + subscription.amountMinor, 0),
    [subscriptions],
  )

  useEffect(() => {
    if (!categoryId && categories[0]?.id) {
      setCategoryId(categories[0].id)
    }
  }, [categories, categoryId])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (!nextChargeDate) return

    await onCreate({
      name: String(form.get('name') ?? ''),
      categoryId: String(form.get('categoryId') ?? ''),
      amount: Number(form.get('amount') ?? 0),
      currency,
      billingDay: Number(form.get('billingDay') ?? 1),
      nextChargeDate: format(nextChargeDate, 'yyyy-MM-dd'),
      autoCreateTransactions: autoCreate,
      notes: String(form.get('notes') ?? ''),
    })

    event.currentTarget.reset()
    setNextChargeDate(undefined)
  }

  return (
    <motion.section
      className="grid gap-6 lg:grid-cols-[1fr_360px]"
      {...pageMotion}
    >
      <motion.div
        className="grid content-start gap-1"
        variants={listMotion}
        initial="hidden"
        animate="show"
      >
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Monthly services</p>
            <p className="truncate text-3xl font-semibold">
              {formatMoney(monthly, 'USD')}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">
            <Repeat2 className="size-3" />
            Auto posting
          </Badge>
        </div>

        {subscriptions.length > 0 ? (
          subscriptions.map((subscription, index) => (
            <motion.div key={subscription.id} variants={itemMotion} layout>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3">
                <div className="min-w-0">
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
                    Next charge {subscription.nextChargeDate}, day{' '}
                    {subscription.billingDay}
                  </p>
                </div>
                <p className="max-w-28 truncate text-right font-semibold sm:max-w-none">
                  {formatMoney(subscription.amountMinor, subscription.currency)}
                </p>
              </div>
              {index < subscriptions.length - 1 ? <Separator /> : null}
            </motion.div>
          ))
        ) : (
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
        )}
      </motion.div>

      <motion.form
        className="grid content-start gap-4 rounded-md border bg-card p-4"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.24 }}
        onSubmit={handleSubmit}
      >
        <div>
          <p className="font-medium">Add subscription</p>
          <p className="text-sm text-muted-foreground">
            Recurring services become transactions on charge date.
          </p>
        </div>
        <div className="grid gap-2">
          <Label>Name</Label>
          <Input name="name" placeholder="GitHub, Spotify, hosting" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Amount</Label>
            <Input name="amount" inputMode="decimal" required />
          </div>
          <div className="grid gap-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {item.symbol} {item.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Billing day</Label>
            <Input
              name="billingDay"
              type="number"
              min={1}
              max={31}
              defaultValue={1}
            />
          </div>
          <div className="grid gap-2">
            <Label>Next charge</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                >
                  <span className="truncate">
                    {nextChargeDate
                      ? format(nextChargeDate, 'PPP')
                      : 'Pick date'}
                  </span>
                  <ChevronRight />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={nextChargeDate}
                  onSelect={setNextChargeDate}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="categoryId" value={categoryId} />
        </div>
        <div className="flex items-center justify-between rounded-md bg-muted/40 p-3">
          <Label htmlFor="autoCreate">Create transactions automatically</Label>
          <Switch
            id="autoCreate"
            checked={autoCreate}
            onCheckedChange={setAutoCreate}
          />
        </div>
        <div className="grid gap-2">
          <Label>Notes</Label>
          <Textarea name="notes" />
        </div>
        <Button type="submit">Save subscription</Button>
      </motion.form>
    </motion.section>
  )
}
