import * as React from "react"
import { DayPicker } from "react-day-picker"
import { clsx } from "clsx"
import "react-day-picker/dist/style.css"

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <div className="bjr-calendar-wrapper">
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={clsx("p-2 bg-white", className)}
        classNames={{
          root: "p-2 bg-white select-none",
          month_caption: "flex justify-center pt-1 pb-2 relative items-center",
          caption_label: "text-xs font-semibold text-navy uppercase tracking-wider",
          nav: "flex items-center justify-between absolute w-full px-1",
          button_previous:
            "h-7 w-7 bg-white hover:bg-gray-100 p-0 text-navy rounded-md transition-colors flex items-center justify-center cursor-pointer border border-gray-200",
          button_next:
            "h-7 w-7 bg-white hover:bg-gray-100 p-0 text-navy rounded-md transition-colors flex items-center justify-center cursor-pointer border border-gray-200",
          month_grid: "w-full border-collapse",
          weekdays: "flex justify-between",
          weekday:
            "text-gray-400 w-8 h-8 font-medium text-[11px] uppercase tracking-wider flex items-center justify-center",
          weeks: "space-y-1 mt-1",
          week: "flex justify-between w-full",
          day: "relative p-0 text-center text-xs w-8 h-8 flex items-center justify-center",
          day_button:
            "h-8 w-8 p-0 font-normal rounded-md transition-colors hover:bg-gray-100 hover:text-navy cursor-pointer flex items-center justify-center text-gray-700 font-mono text-[12px]",
          selected:
            "[&>.rdp-day_button]:bg-navy [&>.rdp-day_button]:text-white [&>.rdp-day_button]:hover:bg-navy [&>.rdp-day_button]:font-semibold [&>.rdp-day_button]:shadow-xs",
          today:
            "[&>.rdp-day_button]:border [&>.rdp-day_button]:border-[#D4AF37] [&>.rdp-day_button]:font-bold [&>.rdp-day_button]:text-navy",
          outside: "opacity-40 text-gray-300",
          disabled: "opacity-30 cursor-not-allowed",
          hidden: "invisible",
          ...classNames
        }}
        {...props}
      />
    </div>
  )
}
Calendar.displayName = "Calendar"
