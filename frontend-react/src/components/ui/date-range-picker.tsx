import * as React from "react"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { format, setHours, setMinutes } from "date-fns"
import { DateRange } from "react-day-picker"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"
import { Input } from "./input"
import { Label } from "./label"

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
  const [startTime, setStartTime] = React.useState("00:00")
  const [endTime, setEndTime] = React.useState("23:59")
  const [open, setOpen] = React.useState(false)
  // Local state buffers intermediate selection (when only "from" is picked)
  const [localDate, setLocalDate] = React.useState<DateRange | undefined>(date)

  // Sync internal time state with external date prop
  React.useEffect(() => {
    if (date?.from) {
      setStartTime(format(date.from, "HH:mm"))
    }
    if (date?.to) {
      setEndTime(format(date.to, "HH:mm"))
    }
  }, [date?.from, date?.to])

  // Sync local date with external date when popover opens or external date changes
  React.useEffect(() => {
    if (!open) {
      setLocalDate(date)
    }
  }, [date, open])

  const handleDateSelect = (selectedDate: DateRange | undefined) => {
    if (!selectedDate) {
      setLocalDate(undefined)
      return
    }

    let newFrom = selectedDate.from
    let newTo = selectedDate.to

    if (newFrom) {
      const [hours, minutes] = startTime.split(':').map(Number)
      newFrom = setMinutes(setHours(newFrom, hours), minutes)
    }

    if (newTo) {
      const [hours, minutes] = endTime.split(':').map(Number)
      newTo = setMinutes(setHours(newTo, hours), minutes)
    }

    const newRange = { from: newFrom, to: newTo }
    setLocalDate(newRange)

    // Propagate to parent only when both dates are selected
    if (newFrom && newTo) {
      setDate(newRange)
    }
  }

  const handleTimeChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') setStartTime(value)
    else setEndTime(value)

    const currentFrom = localDate?.from
    const currentTo = localDate?.to

    if (!currentFrom) return

    let newFrom = currentFrom
    let newTo = currentTo

    if (type === 'start' && newFrom) {
      const [hours, minutes] = value.split(':').map(Number)
      newFrom = setMinutes(setHours(newFrom, hours), minutes)
    }

    if (type === 'end' && newTo) {
      const [hours, minutes] = value.split(':').map(Number)
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
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal truncate px-2",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd.MM HH:mm")} - {format(date.to, "dd.MM HH:mm")}
                </>
              ) : (
                format(date.from, "dd.MM HH:mm")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </span>
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
  )
}
