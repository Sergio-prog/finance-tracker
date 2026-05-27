import { PlusCircle, Tags, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { itemMotion, listMotion, tapMotion } from './animations'

type LabelPickerProps = {
  labels: string[]
  options: string[]
  onChange: (labels: string[]) => void
}

const defaultLabels = ['🏝️ vacation', 'Must haves', 'Work', 'Family']

export function LabelPicker({ labels, options, onChange }: LabelPickerProps) {
  const [draft, setDraft] = useState('')
  const labelOptions = useMemo(
    () => Array.from(new Set([...defaultLabels, ...options])),
    [options],
  )

  function toggleLabel(label: string) {
    onChange(
      labels.includes(label)
        ? labels.filter((item) => item !== label)
        : [...labels, label],
    )
  }

  function addCustomLabel() {
    const nextLabel = draft.trim()
    if (!nextLabel || labels.includes(nextLabel)) return

    onChange([...labels, nextLabel])
    setDraft('')
  }

  return (
    <div className="grid gap-2">
      <Label>Labels</Label>
      <motion.div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        variants={listMotion}
        initial="hidden"
        animate="show"
      >
        {labelOptions.map((label) => {
          const selected = labels.includes(label)

          return (
            <motion.button
              key={label}
              type="button"
              className="shrink-0"
              variants={itemMotion}
              {...tapMotion}
              onClick={() => toggleLabel(label)}
            >
              <Badge
                variant={selected ? 'default' : 'outline'}
                className="h-9 rounded-full px-3"
              >
                <Tags className="size-3" />
                {label}
              </Badge>
            </motion.button>
          )
        })}
      </motion.div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Input
          value={draft}
          maxLength={32}
          placeholder="Add custom label"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addCustomLabel()
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addCustomLabel}>
          <PlusCircle />
          Add
        </Button>
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
