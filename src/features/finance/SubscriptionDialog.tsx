import {
  CircleX,
  Repeat2,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { CategorySelector } from './CategorySelector'
import { currencies, getCurrencySymbol } from './currency'
import { DatePickerRow } from './DatePickerRow'
import { subscriptionCategoryNames } from './subscriptionCategories'
import type { BillingFrequency, Category, OperationType, Subscription } from '@/server/trpc/types'

type SubscriptionDialogProps = {
  categories: Category[]
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
  initial?: Subscription
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
  onDelete?: (id: string) => Promise<void>
  onClose?: () => void
}

export function SubscriptionDialog({
  categories,
  onCreate,
  onCreateCategory,
  initial,
  onUpdate,
  onDelete,
  onClose,
}: SubscriptionDialogProps) {
  const [open, setOpen] = useState(false)
  const [currency, setCurrency] = useState(initial?.currency ?? 'USD')
  const [nextChargeDate, setNextChargeDate] = useState<Date | undefined>(
    initial ? new Date(initial.nextChargeDate) : undefined,
  )
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>(
    initial?.billingFrequency ?? 'monthly',
  )
  const subscriptionCategories = useMemo(
    () =>
      categories.filter((c) => subscriptionCategoryNames.includes(c.name)),
    [categories],
  )
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    initial?.categoryId || subscriptionCategories[0]?.id || '',
  )
  const [autoCreate, setAutoCreate] = useState(
    initial?.autoCreateTransactions ?? true,
  )
  const [isSaving, setIsSaving] = useState(false)
  const isEditing = Boolean(initial)

  useEffect(() => {
    if (!initial) return
    setOpen(true)
    setCurrency(initial.currency)
    setNextChargeDate(new Date(initial.nextChargeDate))
    setBillingFrequency(initial.billingFrequency)
    setSelectedCategoryId(initial.categoryId ?? '')
    setAutoCreate(initial.autoCreateTransactions)
  }, [initial])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (!nextChargeDate) return

    setIsSaving(true)
    try {
      if (isEditing && onUpdate) {
        await onUpdate({
          id: initial.id,
          name: String(form.get('name') ?? ''),
          categoryId: selectedCategoryId || undefined,
          amount: Number(form.get('amount') ?? 0),
          currency,
          nextChargeDate: nextChargeDate.toISOString().slice(0, 10),
          billingFrequency,
          autoCreateTransactions: autoCreate,
          notes: String(form.get('notes') ?? ''),
        })
      } else {
        await onCreate({
          name: String(form.get('name') ?? ''),
          categoryId: selectedCategoryId || undefined,
          amount: Number(form.get('amount') ?? 0),
          currency,
          nextChargeDate: nextChargeDate.toISOString().slice(0, 10),
          billingFrequency,
          autoCreateTransactions: autoCreate,
          notes: String(form.get('notes') ?? ''),
        })
      }
      setOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { setOpen(next); if (!next) onClose?.() }}>
      <SheetTrigger asChild>
        <Button>
          <Repeat2 />
          Add subscription
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto h-[calc(100svh-0.75rem)] max-w-3xl overflow-hidden rounded-t-2xl border-x p-0 sm:h-[min(820px,calc(100svh-2rem))]"
      >
        <form
          className="grid h-full grid-rows-[auto_1fr_auto]"
          onSubmit={handleSubmit}
        >
          <div className="bg-primary text-primary-foreground">
            <SheetHeader className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4">
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="text-primary-foreground hover:bg-black/10"
                >
                  <CircleX />
                </Button>
              </SheetClose>
              <SheetTitle className="text-center text-xl font-semibold text-primary-foreground">
                {isEditing ? 'Edit subscription' : 'Add subscription'}
              </SheetTitle>
              {isEditing && onDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className="text-red-400 hover:bg-black/10 hover:text-red-300"
                  onClick={() => {
                    onDelete(initial.id)
                    setOpen(false)
                  }}
                  aria-label="Delete"
                >
                  <Trash2 />
                </Button>
              ) : (
                <div className="size-10" />
              )}
            </SheetHeader>
          </div>

          <div className="px-4 pb-6 pt-5 sm:px-5">
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label className="text-xs">Name</Label>
                <Input
                  name="name"
                  placeholder="GitHub, Spotify, hosting"
                  required
                  defaultValue={initial?.name ?? ''}
                  className="h-12 px-3 text-lg font-semibold sm:h-14 sm:text-xl"
                />
              </div>
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3 sm:gap-4">
                <CategorySelector
                  categories={subscriptionCategories}
                  selectedCategoryId={selectedCategoryId}
                  onSelect={setSelectedCategoryId}
                  type="expense"
                  onCreateCategory={onCreateCategory}
                />
                <div className="grid gap-1">
                  <Label className="text-xs">Amount</Label>
                  <div className="relative">
                    <Input
                      name="amount"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0"
                      required
                      defaultValue={initial ? String(initial.amountMinor / 100) : undefined}
                      className="h-12 pr-16 text-2xl font-semibold sm:h-14 sm:pr-20 sm:text-3xl [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger className="h-9 w-auto min-w-[3.5rem] rounded-full px-2 text-sm font-semibold">
                          <SelectValue placeholder={getCurrencySymbol(currency)}>
                            {getCurrencySymbol(currency)}
                          </SelectValue>
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
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto px-4 py-5">
            <div className="mx-auto grid max-w-2xl gap-6">
              <div className="grid gap-2">
                <Label>Next charge</Label>
                <DatePickerRow
                  date={nextChargeDate}
                  onDateChange={setNextChargeDate}
                  placeholder="Pick date"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
                <Button
                  asChild
                  type="button"
                  variant={billingFrequency === 'monthly' ? 'default' : 'ghost'}
                  className="rounded-full"
                >
                  <button
                    type="button"
                    onClick={() => setBillingFrequency('monthly')}
                  >
                    Monthly
                  </button>
                </Button>
                <Button
                  asChild
                  type="button"
                  variant={billingFrequency === 'yearly' ? 'default' : 'ghost'}
                  className="rounded-full"
                >
                  <button
                    type="button"
                    onClick={() => setBillingFrequency('yearly')}
                  >
                    Yearly
                  </button>
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-md bg-muted/40 p-3">
                <Label htmlFor="dialog-autoCreate">
                  Create transactions automatically
                </Label>
                <Switch
                  id="dialog-autoCreate"
                  checked={autoCreate}
                  onCheckedChange={setAutoCreate}
                />
              </div>

              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea name="notes" defaultValue={initial?.notes ?? ''} />
              </div>
            </div>
          </div>

          <div className="border-t bg-background/95 p-4 backdrop-blur">
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full rounded-full"
              disabled={isSaving || !nextChargeDate || !selectedCategoryId}
            >
              {isEditing ? 'Update' : 'Save subscription'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
