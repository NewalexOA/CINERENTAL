import * as React from "react"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { format, setHours, setMinutes, parse } from "date-fns"
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
  const [startTime, setStartTime] = React.useState("10:00")
  const [endTime, setEndTime] = React.useState("19:00")

  // Sync internal time state with external date prop if available
  React.useEffect(() => {
    if (date?.from) {
      setStartTime(format(date.from, "HH:mm"))
    }
    if (date?.to) {
      setEndTime(format(date.to, "HH:mm"))
    }
  }, [date?.from, date?.to])

  const handleDateSelect = (selectedDate: DateRange | undefined) => {
    if (!selectedDate) {
      setDate(undefined)
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

    setDate({ from: newFrom, to: newTo })
  }

  const handleTimeChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') setStartTime(value)
    else setEndTime(value)

    if (!date?.from) return

    let newFrom = date.from
    let newTo = date.to

    if (type === 'start' && newFrom) {
      const [hours, minutes] = value.split(':').map(Number)
      newFrom = setMinutes(setHours(newFrom, hours), minutes)
    }

    if (type === 'end' && newTo) {
      const [hours, minutes] = value.split(':').map(Number)
      newTo = setMinutes(setHours(newTo, hours), minutes)
    } else if (type === 'end' && !newTo && newFrom) {
       // If we set end time but no end date selected, assume same day?
       // For now, do nothing until date is picked.
    }

    setDate({ from: newFrom, to: newTo })
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd.MM.yyyy HH:mm")} -{" "}
                  {format(date.to, "dd.MM.yyyy HH:mm")}
                </>
              ) : (
                format(date.from, "dd.MM.yyyy HH:mm")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
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
