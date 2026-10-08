import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-gray-border bg-white px-3 py-1 text-sm shadow-2xs transition-colors placeholder:text-gray-text/60 focus-visible:outline-none focus-visible:border-navy focus-visible:ring-1 focus-visible:ring-navy disabled:cursor-not-allowed disabled:opacity-50 text-navy",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-semibold text-navy leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
))
Label.displayName = "Label"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-gray-border bg-white px-3 py-2 text-sm shadow-2xs placeholder:text-gray-text/60 focus-visible:outline-none focus-visible:border-navy focus-visible:ring-1 focus-visible:ring-navy disabled:cursor-not-allowed disabled:opacity-50 text-navy",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

const Select = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border border-gray-border bg-white px-3 py-1 text-sm shadow-2xs transition-colors placeholder:text-gray-text/60 focus-visible:outline-none focus-visible:border-navy focus-visible:ring-1 focus-visible:ring-navy disabled:cursor-not-allowed disabled:opacity-50 text-navy",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  )
})
Select.displayName = "Select"

export { Input, Label, Textarea, Select }
