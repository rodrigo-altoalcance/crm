"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateTimePickerProps {
  value: string // ISO string or ""
  onChange: (iso: string) => void
  placeholder?: string
  disabled?: boolean
}

function isoToLocal(iso: string): { date: Date | undefined; time: string } {
  if (!iso) return { date: undefined, time: "09:00" }
  const d = new Date(iso)
  if (isNaN(d.getTime())) return { date: undefined, time: "09:00" }
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return { date: d, time: `${hh}:${mm}` }
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha y hora",
  disabled,
}: DateTimePickerProps) {
  const { date: initDate, time: initTime } = isoToLocal(value)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initDate)
  const [time, setTime] = useState(initTime)
  const [open, setOpen] = useState(false)

  function handleDaySelect(day: Date | undefined) {
    setSelectedDate(day)
    if (day) {
      emitChange(day, time)
    }
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTime(e.target.value)
    if (selectedDate) emitChange(selectedDate, e.target.value)
  }

  function emitChange(day: Date, t: string) {
    const [hh, mm] = t.split(":").map(Number)
    const combined = new Date(day)
    combined.setHours(hh || 0, mm || 0, 0, 0)
    onChange(combined.toISOString())
  }

  function handleClear() {
    setSelectedDate(undefined)
    setTime("09:00")
    onChange("")
    setOpen(false)
  }

  const displayLabel = selectedDate
    ? `${format(selectedDate, "dd/MM/yyyy", { locale: es })} ${time}`
    : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-9 text-sm",
            !displayLabel && "text-slate-400"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          {displayLabel ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDaySelect}
        />
        <div className="border-t p-3 flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">Hora</label>
          <input
            type="time"
            value={time}
            onChange={handleTimeChange}
            className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleClear}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Limpiar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
