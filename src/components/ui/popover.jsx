import * as React from "react"
import { clsx } from "clsx"

export function Popover({ children, open, onOpenChange, className }) {
  const popoverRef = React.useRef(null)

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        if (onOpenChange) onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("touchstart", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [open, onOpenChange])

  return (
    <div ref={popoverRef} className={clsx("relative inline-block w-full", className)}>
      {children}
    </div>
  )
}

export function PopoverTrigger({ children, onClick, ...props }) {
  return (
    <div onClick={onClick} {...props}>
      {children}
    </div>
  )
}

export function PopoverContent({ children, open, className, align = "start" }) {
  if (!open) return null

  return (
    <div
      className={clsx(
        "absolute z-50 mt-1.5 rounded-md border border-gray-200 bg-white p-1 shadow-lg outline-none animate-in fade-in-0 zoom-in-95",
        align === "end" ? "right-0" : "left-0",
        className
      )}
    >
      {children}
    </div>
  )
}
