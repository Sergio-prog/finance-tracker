import { CircleX, Trash2 } from 'lucide-react'
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
import { CategorySelector } from '@/features/finance/CategorySelector'
import { currencies, getCurrencySymbol } from '@/features/finance/currency'
import { DatePickerRow } from '@/features/finance/DatePickerRow'
import type { Category, WishlistItem } from '@/server/trpc/types'

type WishlistDialogProps = {
  categories: Category[]
  onCreate: (input: {
    title: string
    description?: string
    imageUrl?: string
    url?: string
    plannedDate?: string
    amount?: number
    currency?: string
    categoryId?: string
  }) => Promise<void>
  initial?: WishlistItem
  onUpdate?: (input: {
    id: string
    title?: string
    description?: string
    imageUrl?: string
    url?: string
    plannedDate?: string
    amount?: number
    currency?: string
    categoryId?: string
  }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onClose?: () => void
}

export function WishlistDialog({
  categories,
  onCreate,
  initial,
  onUpdate,
  onDelete,
  onClose,
}: WishlistDialogProps) {
  const [open, setOpen] = useState(false)
  const [currency, setCurrency] = useState(initial?.currency ?? 'USD')
  const [plannedDate, setPlannedDate] = useState<Date | undefined>(
    initial?.plannedDate ? new Date(initial.plannedDate) : undefined,
  )
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    initial?.categoryId || '__none__',
  )
  const [isSaving, setIsSaving] = useState(false)
  const isEditing = Boolean(initial)

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  )

  useEffect(() => {
    if (!initial) return
    setOpen(true)
    setCurrency(initial.currency ?? 'USD')
    setPlannedDate(initial.plannedDate ? new Date(initial.plannedDate) : undefined)
    setSelectedCategoryId(initial.categoryId || '__none__')
  }, [initial])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isEditing && !initial) return

    const form = new FormData(event.currentTarget)
    const amount = form.get('amount')
      ? Number(form.get('amount'))
      : undefined

    setIsSaving(true)
    try {
      const categoryId = selectedCategoryId === '__none__' ? undefined : selectedCategoryId
      if (isEditing && onUpdate) {
        await onUpdate({
          id: initial!.id,
          title: String(form.get('title') ?? ''),
          description: String(form.get('description') ?? '') || undefined,
          imageUrl: String(form.get('imageUrl') ?? '') || undefined,
          url: String(form.get('url') ?? '') || undefined,
          plannedDate: plannedDate?.toISOString().slice(0, 10),
          amount,
          currency: amount ? currency : undefined,
          categoryId,
        })
      } else {
        await onCreate({
          title: String(form.get('title') ?? ''),
          description: String(form.get('description') ?? '') || undefined,
          imageUrl: String(form.get('imageUrl') ?? '') || undefined,
          url: String(form.get('url') ?? '') || undefined,
          plannedDate: plannedDate?.toISOString().slice(0, 10),
          amount,
          currency: amount ? currency : undefined,
          categoryId,
        })
      }
      setOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) onClose?.()
      }}
    >
      <SheetTrigger asChild>
        <Button size="lg" variant="default">
          Add wish
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
                {isEditing ? 'Edit wish' : 'Add to wishlist'}
              </SheetTitle>
              {isEditing && initial && onDelete ? (
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

          <div className="min-h-0 overflow-y-auto px-4 py-5">
            <div className="mx-auto grid max-w-2xl gap-5">
              {/* Title */}
              <div className="grid gap-1.5">
                <Label className="text-xs">Title</Label>
                <Input
                  name="title"
                  placeholder="What do you want?"
                  required
                  defaultValue={initial?.title ?? ''}
                  className="h-12 px-3 text-lg font-semibold sm:h-14 sm:text-xl"
                />
              </div>

              {/* Price & Currency */}
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Price (optional)</Label>
                  <Input
                    name="amount"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0"
                    defaultValue={
                      initial?.amountMinor
                        ? String(initial.amountMinor / 100)
                        : undefined
                    }
                    className="h-12 text-lg font-semibold sm:h-14 sm:text-xl [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-10 w-auto min-w-[4.5rem] rounded-md px-3 text-sm font-medium">
                    <SelectValue>
                      {getCurrencySymbol(currency)} {currency}
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

              {/* Category */}
              <div className="grid gap-1.5">
                <Label className="text-xs">Category for transaction (optional)</Label>
                <div className="w-fit">
                  <CategorySelector
                    categories={expenseCategories}
                    selectedCategoryId={selectedCategoryId}
                    onSelect={setSelectedCategoryId}
                    type="expense"
                  />
                </div>
              </div>

              {/* Planned date */}
              <div className="grid gap-1.5">
                <Label className="text-xs">Plan to buy on (optional)</Label>
                <DatePickerRow
                  date={plannedDate}
                  onDateChange={setPlannedDate}
                  placeholder="Someday"
                />
              </div>

              {/* URL to buy */}
              <div className="grid gap-1.5">
                <Label className="text-xs">Link to buy (optional)</Label>
                <Input
                  name="url"
                  type="url"
                  placeholder="https://..."
                  defaultValue={initial?.url ?? ''}
                  className="h-10"
                />
              </div>

              {/* Image URL */}
              <div className="grid gap-1.5">
                <Label className="text-xs">Image URL (optional)</Label>
                <Input
                  name="imageUrl"
                  type="url"
                  placeholder="https://..."
                  defaultValue={initial?.imageUrl ?? ''}
                  className="h-10"
                />
              </div>

              {/* Description */}
              <div className="grid gap-1.5">
                <Label className="text-xs">Description (optional)</Label>
                <Textarea
                  name="description"
                  placeholder="Why do you want this?"
                  defaultValue={initial?.description ?? ''}
                  className="min-h-20 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="border-t bg-background/95 p-4 backdrop-blur">
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full rounded-full"
              disabled={isSaving}
            >
              {isEditing ? 'Update' : 'Add to wishlist'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
