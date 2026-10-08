import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatINR(amount) {
  const num = Number(amount) || 0
  const hasDecimals = num % 1 !== 0

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatTransactionCount(count) {
  const n = Number(count) || 0
  return `Across ${n} transaction${n === 1 ? '' : 's'}`
}
