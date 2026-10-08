import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-xs",
  {
    variants: {
      variant: {
        default: "bg-navy text-white hover:bg-navy-dark active:bg-navy-dark",
        outline: "border border-navy bg-white hover:bg-navy hover:text-white text-navy transition-all",
        secondary: "border border-gold bg-white text-navy hover:bg-gold-light/40",
        ghost: "hover:bg-light-gray text-navy shadow-none",
        gold: "bg-gold text-navy font-semibold hover:bg-gold-dark hover:text-white",
        destructive: "border border-navy/40 bg-white text-navy hover:bg-light-gray",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-8 text-base",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
