import { format } from 'date-fns'
import { CalendarIcon, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type DatePickerRowProps = {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  label?: string
  placeholder?: string
}

export function DatePickerRow({
  date,
  onDateChange,
  label,
  placeholder = 'Pick date',
}: DatePickerRowProps) {
  return (
    <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md bg-muted/30 px-3 py-2">
      <span className="text-primary">
        <CalendarIcon />
      </span>
      <span className="min-w-0 truncate text-sm font-medium">
        {date ? format(date, 'PPP') : label ?? placeholder}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute inset-0 rounded-md text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label={label ?? placeholder}
          >
            <span className="sr-only">{label ?? placeholder}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onDateChange}
          />
        </PopoverContent>
      </Popover>
      <Button type="button" variant="ghost" size="icon" tabIndex={-1}>
        <ChevronRight />
      </Button>
    </div>
  )
}
