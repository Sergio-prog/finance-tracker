import { format } from 'date-fns'
import {
  CalendarIcon,
  ChevronRight,
  CircleX,
  ImagePlus,
  MinusCircle,
  PlusCircle,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'

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
import { CategoryPicker } from './CategoryPicker'
import { currencies, getCurrencySymbol } from './currency'
import { LabelPicker } from './LabelPicker'
import type { Category, OperationType } from '@/server/trpc/types'

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
}

export function OperationDialog({
  categories,
  labelOptions,
  onCreate,
  onCreateCategory,
}: OperationDialogProps) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<OperationType>('expense')
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [labels, setLabels] = useState<string[]>(['Must haves'])
  const [currency, setCurrency] = useState('USD')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [isSaving, setIsSaving] = useState(false)

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
      setOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
                Add transaction
              </SheetTitle>
              <div className="size-10" />
            </SheetHeader>

            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 pb-7 sm:gap-4 sm:px-5">
              <div className="grid size-16 place-items-center rounded-full border-2 border-dashed border-primary-foreground/50 text-2xl sm:size-20 sm:text-3xl">
                {selectedCategory?.icon ?? '•'}
              </div>
              <Input
                name="amount"
                inputMode="decimal"
                placeholder="0"
                required
                className="h-16 min-w-0 border-0 bg-transparent px-0 text-right text-4xl font-semibold text-primary-foreground shadow-none placeholder:text-primary-foreground/70 focus-visible:ring-0 sm:text-5xl"
              />
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-12 w-20 rounded-full border-0 bg-black/10 text-primary-foreground sm:w-24">
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

              <CategoryPicker
                categories={filteredCategories}
                type={type}
                selectedCategoryId={selectedCategoryId}
                onSelect={setSelectedCategoryId}
                onCreateCategory={onCreateCategory}
              />

              <ActionRow
                icon={<CalendarIcon />}
                label={date ? format(date, 'PPP') : 'Pick date'}
              >
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="absolute inset-0 rounded-md text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      aria-label="Pick transaction date"
                    >
                      <span className="sr-only">Pick transaction date</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                    />
                  </PopoverContent>
                </Popover>
                <Button type="button" variant="ghost" size="icon" tabIndex={-1}>
                  <ChevronRight />
                </Button>
              </ActionRow>

              <div className="grid gap-2">
                <Label>Note</Label>
                <Textarea
                  name="note"
                  placeholder="Write a note"
                  className="min-h-20"
                />
              </div>

              <LabelPicker
                labels={labels}
                options={labelOptions}
                onChange={setLabels}
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
              Save {getCurrencySymbol(currency)} transaction
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function ActionRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md bg-muted/30 px-3 py-2">
      <span className="text-primary">{icon}</span>
      <span className="min-w-0 truncate text-sm font-medium">{label}</span>
      {children}
    </div>
  )
}
