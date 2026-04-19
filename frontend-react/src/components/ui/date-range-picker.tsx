import * as React from "react"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { format, setHours, setMinutes, parse, isValid, startOfDay } from "date-fns"
import { DateRange } from "react-day-picker"
import { cn } from "../../lib/utils"
import { DATE_TIME_FORMAT, DATE_PARSE_FORMATS } from "../../lib/date-formats"
import { Button } from "./button"
import { Calendar } from "./calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"
import { Input } from "./input"
import { Label } from "./label"

function tryParseDate(input: string): Date | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const ref = startOfDay(new Date())
  for (const fmt of DATE_PARSE_FORMATS) {
    const result = parse(trimmed, fmt, ref)
    if (isValid(result)) return result
  }
  return null
}

function formatDisplay(d: Date): string {
  return format(d, DATE_TIME_FORMAT)
}

interface DateTimeRangePickerProps {
  date?: DateRange
  setDate: (date: DateRange | undefined) => void
  className?: string
  placeholder?: string
}

export function DateTimeRangePicker({
  date,
  setDate,
  className,
  placeholder = "Выберите период"
}: DateTimeRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  // Local state buffers intermediate selection (when only "from" is picked)
  const [localDate, setLocalDate] = React.useState<DateRange | undefined>(date)

  // Text input state
  const [inputValue, setInputValue] = React.useState("")
  const [inputError, setInputError] = React.useState(false)

  // Derive time from localDate instead of separate state
  const startTime = localDate?.from ? format(localDate.from, "HH:mm") : "00:00"
  const endTime = localDate?.to ? format(localDate.to, "HH:mm") : "23:59"

  // Sync display text with external date
  React.useEffect(() => {
    if (date?.from) {
      const fromStr = formatDisplay(date.from)
      const toStr = date.to ? formatDisplay(date.to) : ""
      setInputValue(toStr ? `${fromStr} - ${toStr}` : fromStr)
    } else {
      setInputValue("")
    }
  }, [date?.from, date?.to])

  // Sync local date with external date when popover opens
  React.useEffect(() => {
    if (open) {
      setLocalDate(date)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputCommit = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      setLocalDate(undefined)
      setDate(undefined)
      setInputError(false)
      return
    }

    // Split on en-dash/em-dash (any spacing), or hyphen with spaces around it
    const parts = trimmed.split(/\s*[–—]\s*|\s+-\s+/)
    if (parts.length === 2) {
      const from = tryParseDate(parts[0])
      const to = tryParseDate(parts[1])
      if (from && to && from <= to) {
        const newRange = { from, to }
        setLocalDate(newRange)
        setDate(newRange)
        setInputError(false)
        return
      }
    } else if (parts.length === 1) {
      const from = tryParseDate(parts[0])
      if (from) {
        const newRange = { from, to: undefined }
        setLocalDate(newRange)
        setDate(newRange)
        setInputError(false)
        return
      }
    }

    setInputError(true)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleInputCommit(inputValue)
    }
  }

  const handleInputBlur = () => {
    handleInputCommit(inputValue)
  }

  const handleDateSelect = (selectedDate: DateRange | undefined) => {
    if (!selectedDate) {
      setLocalDate(undefined)
      return
    }

    let newFrom = selectedDate.from
    let newTo = selectedDate.to

    if (newFrom) {
      const [h, m] = startTime.split(':').map(Number)
      newFrom = setMinutes(setHours(newFrom, h), m)
    }

    if (newTo) {
      const [h, m] = endTime.split(':').map(Number)
      newTo = setMinutes(setHours(newTo, h), m)
    }

    const newRange = { from: newFrom, to: newTo }
    setLocalDate(newRange)

    // Propagate to parent only when both dates are selected
    if (newFrom && newTo) {
      setDate(newRange)
    }
  }

  const handleTimeChange = (type: 'start' | 'end', value: string) => {
    const [hoursStr, minutesStr] = value.split(':')
    const hours = parseInt(hoursStr, 10)
    const minutes = parseInt(minutesStr, 10)
    if (isNaN(hours) || isNaN(minutes)) return

    const currentFrom = localDate?.from
    const currentTo = localDate?.to

    if (!currentFrom) return

    let newFrom = currentFrom
    let newTo = currentTo

    if (type === 'start') {
      newFrom = setMinutes(setHours(newFrom, hours), minutes)
    }

    if (type === 'end' && newTo) {
      newTo = setMinutes(setHours(newTo, hours), minutes)
    }

    const newRange = { from: newFrom, to: newTo }
    setLocalDate(newRange)

    if (newFrom && newTo) {
      setDate(newRange)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && (!localDate || (localDate.from && !localDate.to))) {
      // Popover closing with incomplete or cleared selection — reset to external date
      setLocalDate(date)
    }
    setOpen(isOpen)
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Input
        value={inputValue}
        onChange={(e) => { setInputValue(e.target.value); setInputError(false) }}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        maxLength={40}
        aria-invalid={inputError || undefined}
        className={cn(
          "h-9 text-xs flex-1 min-w-0",
          inputError && "border-destructive focus-visible:ring-destructive"
        )}
      />
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label="Открыть календарь"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={localDate?.from}
              selected={localDate}
              onSelect={handleDateSelect}
              numberOfMonths={2}
            />
            <div className="border-t p-3 bg-muted/20">
              <div className="flex items-center gap-4">
                 <div className="flex flex-col gap-1.5 flex-1">
                   <Label className="text-xs text-muted-foreground">Время начала</Label>
                   <div className="relative">
                     <Clock className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                     <Input
                       type="time"
                       value={startTime}
                       onChange={(e) => handleTimeChange('start', e.target.value)}
                       className="h-8 pl-7 text-xs"
                     />
                   </div>
                 </div>
                 <div className="flex flex-col gap-1.5 flex-1">
                   <Label className="text-xs text-muted-foreground">Время окончания</Label>
                   <div className="relative">
                     <Clock className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                     <Input
                       type="time"
                       value={endTime}
                       onChange={(e) => handleTimeChange('end', e.target.value)}
                       className="h-8 pl-7 text-xs"
                     />
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
