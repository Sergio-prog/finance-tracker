import { format } from 'date-fns'
import {
  ChevronRight,
  CircleX,
  ImagePlus,
  MinusCircle,
  PlusCircle,
  Trash2,
} from 'lucide-react'
import { motion } from 'motion/react'
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
import { Textarea } from '@/components/ui/textarea'
import { tapMotion } from './animations'
import { CategorySelector } from './CategorySelector'
import { currencies, getCurrencySymbol } from './currency'
import { DatePickerRow } from './DatePickerRow'
import { LabelPicker } from './LabelPicker'
import type { Category, OperationType, Transaction } from '@/server/trpc/types'

type OperationDialogProps = {
  categories: Category[]
  labelOptions: string[]
  onCreate: (input: {
    type: OperationType
    categoryId: string
    amount: number
    currency: string
    operationDate: string
    note?: string
    labels: string[]
    photoUrl?: string
  }) => Promise<void>
  onCreateCategory: (input: {
    name: string
    icon: string
    type: OperationType
    color?: string
  }) => Promise<Category>
  onAddLabel?: (name: string) => void
  initial?: Transaction
  onUpdate?: (input: {
    id: string
    type?: OperationType
    categoryId?: string
    amount?: number
    currency?: string
    operationDate?: string
    note?: string
    labels?: string[]
    photoUrl?: string
  }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onClose?: () => void
}

export function OperationDialog({
  categories,
  labelOptions,
  onCreate,
  onCreateCategory,
  onAddLabel,
  initial,
  onUpdate,
  onDelete,
  onClose,
}: OperationDialogProps) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<OperationType>(initial?.type ?? 'expense')
  const [date, setDate] = useState<Date | undefined>(
    initial ? new Date(initial.operationDate) : new Date(),
  )
  const [labels, setLabels] = useState<string[]>(initial?.labels ?? ['Must haves'])
  const [currency, setCurrency] = useState(initial?.currency ?? 'USD')
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    initial?.categoryId ?? '',
  )
  const [isSaving, setIsSaving] = useState(false)
  const isEditing = Boolean(initial)

  useEffect(() => {
    if (!initial) return
    setOpen(true)
    setType(initial.type)
    setDate(new Date(initial.operationDate))
    setLabels(initial.labels)
    setCurrency(initial.currency)
    setSelectedCategoryId(initial.categoryId)
  }, [initial])

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  )
  const selectedCategory = filteredCategories.find(
    (category) => category.id === selectedCategoryId,
  )

  useEffect(() => {
    const categoryExists = filteredCategories.some(
      (category) => category.id === selectedCategoryId,
    )

    if (!categoryExists) {
      setSelectedCategoryId(filteredCategories[0]?.id ?? '')
    }
  }, [filteredCategories, selectedCategoryId])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (!selectedCategoryId) return

    setIsSaving(true)
    try {
      if (isEditing && onUpdate) {
        await onUpdate({
          id: initial.id,
          type,
          categoryId: selectedCategoryId,
          amount: Number(form.get('amount') ?? 0),
          currency,
          operationDate: format(date ?? new Date(), 'yyyy-MM-dd'),
          note: String(form.get('note') ?? ''),
          labels,
          photoUrl: '',
        })
      } else {
        await onCreate({
          type,
          categoryId: selectedCategoryId,
          amount: Number(form.get('amount') ?? 0),
          currency,
          operationDate: format(date ?? new Date(), 'yyyy-MM-dd'),
          note: String(form.get('note') ?? ''),
          labels,
          photoUrl: '',
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
        <Button
          size="lg"
          className="fixed right-4 bottom-20 z-30 shadow-xl md:static"
        >
          <PlusCircle />
          Add
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
                {isEditing ? 'Edit transaction' : 'Add transaction'}
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
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3 sm:gap-4">
              <CategorySelector
                categories={filteredCategories}
                selectedCategoryId={selectedCategoryId}
                onSelect={setSelectedCategoryId}
                type={type}
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
                    className="h-12 min-w-0 pr-16 text-2xl font-semibold sm:h-14 sm:pr-20 sm:text-3xl [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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

          <div className="min-h-0 overflow-y-auto px-4 py-5">
            <div className="mx-auto grid max-w-2xl gap-6">
              <div className="grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
                <Button
                  asChild
                  type="button"
                  variant={type === 'expense' ? 'default' : 'ghost'}
                  className="rounded-full"
                >
                  <motion.button
                    type="button"
                    {...tapMotion}
                    onClick={() => setType('expense')}
                  >
                    <MinusCircle />
                    Expense
                  </motion.button>
                </Button>
                <Button
                  asChild
                  type="button"
                  variant={type === 'income' ? 'default' : 'ghost'}
                  className="rounded-full"
                >
                  <motion.button
                    type="button"
                    {...tapMotion}
                    onClick={() => setType('income')}
                  >
                    <PlusCircle />
                    Profit
                  </motion.button>
                </Button>
              </div>

              <DatePickerRow
                date={date}
                onDateChange={setDate}
                label="Transaction date"
              />

              <div className="grid gap-2">
                <Label>Note</Label>
                <Textarea
                  name="note"
                  placeholder="Write a note"
                  defaultValue={initial?.note ?? ''}
                  className="min-h-24 resize-none"
                />
              </div>

              <LabelPicker
                labels={labels}
                options={labelOptions}
                onChange={setLabels}
                onAddLabel={onAddLabel}
              />

              <label className="flex min-h-20 cursor-pointer items-center justify-between rounded-md border border-dashed border-border bg-muted/30 px-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-3">
                  <ImagePlus className="size-5 text-primary" />
                  Attach receipt photo
                </span>
                <ChevronRight className="size-4" />
                <Input
                  name="photo"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <div className="border-t bg-background/95 p-4 backdrop-blur">
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full rounded-full"
              disabled={isSaving || !selectedCategoryId}
            >
              {isEditing ? 'Update' : `Save ${getCurrencySymbol(currency)} transaction`}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
