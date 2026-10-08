import * as React from "react"
import { cn } from "@/lib/utils"

export function Badge({ className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border border-gray-300 text-gray-700 text-[11px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-sm bg-transparent",
        className
      )}
      {...props}
    />
  )
}

export function CategoryBadge({ category, color }) {
  const cat = (category || "").toUpperCase()
  const badgeColor = color || "#0B2149"

  return (
    <span
      className="inline-flex items-center text-[11px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-sm bg-transparent"
      style={{
        border: `1px solid ${badgeColor}`,
        color: badgeColor
      }}
    >
      {cat || "UNCATEGORIZED"}
    </span>
  )
}
