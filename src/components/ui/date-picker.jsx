import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { clsx } from "clsx"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  id
}) {
  const [open, setOpen] = React.useState(false)

  // Parse existing formatted date string (e.g. "08 Oct 2026") or Date object
  const selectedDate = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return value
    try {
      const parsed = parse(value, "dd MMM yyyy", new Date())
      return isValid(parsed) ? parsed : undefined
    } catch {
      return undefined
    }
  }, [value])

  const handleSelect = (date) => {
    if (date) {
      const formatted = format(date, "dd MMM yyyy")
      if (onChange) onChange(formatted)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen} className={className}>
      <PopoverTrigger onClick={() => setOpen(!open)}>
        <button
          type="button"
          id={id}
          className={clsx(
            "w-full h-9 px-3 flex items-center justify-between text-left text-[13px] rounded-md border border-gray-200 bg-white font-normal transition-colors cursor-pointer",
            "hover:bg-gray-50 focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy",
            !value && "text-gray-400"
          )}
        >
          <span className="font-mono tabular-nums text-gray-900">
            {value || placeholder}
          </span>
          <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>

      <PopoverContent open={open} className="w-auto p-0 border border-gray-200 shadow-md">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
