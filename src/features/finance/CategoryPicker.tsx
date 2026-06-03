import { PlusCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { tapMotion } from './animations'
import { categoryIconOptions, customCategoryColor } from './categoryOptions'
import { cn } from '@/lib/utils'
import type { Category, OperationType } from '@/server/trpc/types'

type CategoryPickerProps = {
  categories: Category[]
  type?: OperationType
  selectedCategoryId: string
  onSelect: (categoryId: string) => void
  onCreateCategory?: (input: {
    name: string
    icon: string
    type: OperationType
    color?: string
  }) => Promise<Category>
}

export function CategoryPicker({
  categories,
  type,
  selectedCategoryId,
  onSelect,
  onCreateCategory,
}: CategoryPickerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<(typeof categoryIconOptions)[number]>('⭐')
  const [isSaving, setIsSaving] = useState(false)

  async function handleCreateCategory() {
    const trimmedName = name.trim()
    if (!trimmedName || !onCreateCategory) return

    setIsSaving(true)
    try {
      const created = await onCreateCategory({
        name: trimmedName,
        icon,
        type: type ?? 'expense',
        color: customCategoryColor,
      })
      onSelect(created.id)
      setName('')
      setIcon('⭐')
      setIsCreating(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <Label>Category</Label>
        {type && onCreateCategory ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setIsCreating((current) => !current)}
          >
            <PlusCircle />
            New
          </Button>
        ) : null}
      </div>

      <motion.div
        className="grid grid-cols-4 gap-3 sm:grid-cols-6"
        variants={{
          hidden: { opacity: 1 },
          show: { opacity: 1, transition: { staggerChildren: 0.008 } },
        }}
        initial="hidden"
        animate="show"
      >
        {categories.map((category) => {
          const selected = category.id === selectedCategoryId

          return (
            <motion.button
              key={category.id}
              type="button"
              className="grid min-w-0 justify-items-center gap-2"
              variants={{
                hidden: { opacity: 0, y: 4 },
                show: { opacity: 1, y: 0, transition: { duration: 0.1 } },
              }}
              {...tapMotion}
              onClick={() => onSelect(category.id)}
            >
              <span
                className={cn(
                  'grid size-14 place-items-center rounded-full border text-2xl transition',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-card text-card-foreground',
                )}
              >
                {category.icon}
              </span>
              <span className="max-w-full truncate text-xs text-muted-foreground">
                {category.name}
              </span>
            </motion.button>
          )
        })}
      </motion.div>

      <AnimatePresence initial={false}>
        {isCreating ? (
          <motion.div
            className="grid gap-3 rounded-md border bg-muted/20 p-3"
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid gap-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={name}
                maxLength={40}
                placeholder="Gym, books, SaaS"
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-8 gap-2 sm:grid-cols-12">
                {categoryIconOptions.map((item) => (
                  <motion.button
                    key={item}
                    type="button"
                    className={cn(
                      'grid size-9 place-items-center rounded-full border text-lg',
                      item === icon
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card',
                    )}
                    {...tapMotion}
                    onClick={() => setIcon(item)}
                  >
                    {item}
                  </motion.button>
                ))}
              </div>
            </div>
            <Button
              type="button"
              disabled={isSaving || !name.trim()}
              onClick={handleCreateCategory}
            >
              Create category
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
