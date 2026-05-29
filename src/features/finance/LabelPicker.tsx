import { Plus, Tags, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { itemMotion, listMotion, tapMotion } from './animations'

type LabelPickerProps = {
  labels: string[]
  options: string[]
  onChange: (labels: string[]) => void
  onAddLabel?: (name: string) => void
}

export function LabelPicker({
  labels,
  options,
  onChange,
  onAddLabel,
}: LabelPickerProps) {
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)

  function toggleLabel(label: string) {
    onChange(
      labels.includes(label)
        ? labels.filter((item) => item !== label)
        : [...labels, label],
    )
  }

  function handleCreate() {
    const nextLabel = draft.trim()
    if (!nextLabel) return

    if (!labels.includes(nextLabel)) {
      onChange([...labels, nextLabel])
    }
    onAddLabel?.(nextLabel)
    setDraft('')
    setOpen(false)
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>Labels</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="ghost">
              <Plus />
              New
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" side="top" className="w-64 p-3">
            <div className="grid gap-2">
              <Input
                value={draft}
                maxLength={32}
                placeholder="Label name"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleCreate()
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                disabled={!draft.trim()}
                onClick={handleCreate}
              >
                Create
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {options.map((label) => {
          const selected = labels.includes(label)

          return (
            <motion.button
              key={label}
              type="button"
              className="shrink-0"
              {...tapMotion}
              onClick={() => toggleLabel(label)}
            >
              <Badge
                variant={selected ? 'default' : 'outline'}
                className="h-8 rounded-full px-3 whitespace-nowrap"
              >
                <Tags className="size-3" />
                {label}
              </Badge>
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence initial={false}>
        {labels.length > 0 ? (
          <motion.div
            className="flex flex-wrap gap-2"
            variants={listMotion}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
          >
            {labels.map((label) => (
              <motion.div key={label} variants={itemMotion} layout>
                <Badge variant="secondary" className="rounded-full">
                  {label}
                  <button
                    type="button"
                    aria-label={`Remove ${label}`}
                    onClick={() => toggleLabel(label)}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
