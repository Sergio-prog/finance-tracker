import { format } from 'date-fns'
import { CalendarIcon, ChevronRight } from 'lucide-react'

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
    <Popover>
      <PopoverTrigger asChild>
        <div
          className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/50"
          role="button"
          tabIndex={0}
        >
          <span className="text-primary">
            <CalendarIcon />
          </span>
          <span className="min-w-0 truncate text-sm font-medium">
            {date ? format(date, 'PPP') : label ?? placeholder}
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
        />
      </PopoverContent>
    </Popover>
  )
}
