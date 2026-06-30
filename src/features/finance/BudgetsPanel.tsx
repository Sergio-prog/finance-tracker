import { PiggyBank, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

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
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { CategorySelector } from './CategorySelector'
import { formatMoney } from './format'
import type { BudgetWithSpending, Category } from '@/server/trpc/types'

type BudgetsPanelProps = {
  categories: Category[]
  budgets: BudgetWithSpending[]
  mainCurrency?: string
  onCreateBudget: (input: {
    categoryId: string
    amountLimit: number
    period: 'monthly' | 'yearly'
    startDate: string
  }) => Promise<void>
  onUpdateBudget: (input: {
    id: string
    amountLimit?: number
    period?: 'monthly' | 'yearly'
    startDate?: string
  }) => Promise<void>
  onDeleteBudget: (id: string) => Promise<void>
}

function getProgressColor(percentage: number): string {
  if (percentage >= 90) return 'hsl(var(--destructive))'
  if (percentage >= 75) return '#f59e0b'
  return 'hsl(var(--primary))'
}

function defaultStartDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

export function BudgetsPanel({
  categories,
  budgets,
  mainCurrency = 'USD',
  onCreateBudget,
  onDeleteBudget,
}: BudgetsPanelProps) {
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-medium">
          <PiggyBank className="size-4" />
          Budgets
        </p>
        <BudgetDialog categories={expenseCategories} onSubmit={onCreateBudget} />
      </div>
      {budgets.length === 0 ? (
        <div className="grid min-h-40 place-items-center rounded-md border bg-card text-sm text-muted-foreground">
          No budgets yet. Add one to start tracking your spending.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              mainCurrency={mainCurrency}
              onDelete={onDeleteBudget}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BudgetCard({
  budget,
  mainCurrency,
  onDelete,
}: {
  budget: BudgetWithSpending
  mainCurrency: string
  onDelete: (id: string) => Promise<void>
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const progressColor = getProgressColor(budget.percentage)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await onDelete(budget.id)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl leading-none">{budget.categoryIcon}</span>
          <div className="min-w-0">
            <p className="font-medium truncate">{budget.categoryName}</p>
            <p className="text-xs text-muted-foreground capitalize">{budget.period}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label="Delete budget"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Spent</span>
          <span>
            {formatMoney(budget.spent, mainCurrency)}
            <span className="text-muted-foreground">
              {' '}/ {formatMoney(budget.amountLimit, mainCurrency)}
            </span>
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${budget.percentage}%`,
              backgroundColor: progressColor,
            }}
          />
        </div>
        <p className="text-xs text-right text-muted-foreground">{budget.percentage}%</p>
      </div>
    </div>
  )
}

function BudgetDialog({
  categories,
  onSubmit,
}: {
  categories: Category[]
  onSubmit: (input: {
    categoryId: string
    amountLimit: number
    period: 'monthly' | 'yearly'
    startDate: string
  }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories[0]?.id ?? '',
  )
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const amountLimit = Number(form.get('amountLimit') ?? 0)
    const startDate = String(form.get('startDate') ?? defaultStartDate())

    if (!selectedCategoryId || amountLimit <= 0) return

    setIsSaving(true)
    try {
      await onSubmit({ categoryId: selectedCategoryId, amountLimit, period, startDate })
      setOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus />
          Add budget
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto h-auto max-w-xl rounded-t-2xl border-x p-0"
      >
        <form onSubmit={handleSubmit}>
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle>Add budget</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-6 pb-6">
            <div className="space-y-2">
              <Label>Category</Label>
              <CategorySelector
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelect={setSelectedCategoryId}
                type="expense"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amountLimit">Limit amount</Label>
              <Input
                id="amountLimit"
                name="amountLimit"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <Select
                value={period}
                onValueChange={(v) => setPeriod(v as 'monthly' | 'yearly')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={defaultStartDate()}
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
