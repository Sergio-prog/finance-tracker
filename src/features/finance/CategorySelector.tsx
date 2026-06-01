import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { CategoryPicker } from './CategoryPicker'
import type { Category, OperationType } from '@/server/trpc/types'

type CategorySelectorProps = {
  categories: Category[]
  selectedCategoryId: string
  onSelect: (categoryId: string) => void
  type?: OperationType
  onCreateCategory?: (input: {
    name: string
    icon: string
    type: OperationType
    color?: string
  }) => Promise<Category>
}

export function CategorySelector({
  categories,
  selectedCategoryId,
  onSelect,
  type,
  onCreateCategory,
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false)
  const selected = categories.find((c) => c.id === selectedCategoryId)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex shrink-0 items-center gap-2 rounded-full bg-muted px-3 py-2 hover:bg-accent transition"
        >
          <span className="text-lg shrink-0">{selected?.icon ?? '•'}</span>
          <span className="w-16 text-left text-sm font-medium truncate sm:w-20">
            {selected?.name ?? 'Category'}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-3xl rounded-t-2xl border-x p-0 sm:max-h-[70vh]"
      >
        <SheetHeader className="p-4 pb-0">
          <SheetTitle>Choose category</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto p-4 pt-3">
          <CategoryPicker
            categories={categories}
            type={type}
            selectedCategoryId={selectedCategoryId}
            onSelect={(id) => {
              onSelect(id)
              setOpen(false)
            }}
            onCreateCategory={onCreateCategory}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
