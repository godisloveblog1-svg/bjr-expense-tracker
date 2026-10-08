import React, { useState } from "react"
import { FileText, Receipt } from "lucide-react"
import { CategoryBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog"
import { formatINR } from "@/lib/utils"

export default function ExpenseTable({
  expenses = [],
  onDelete,
  isAdmin = false,
  categoryColorMap = {}
}) {
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  // Calculate total for table footer
  const totalAmount = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  // Empty state container
  if (!expenses || expenses.length === 0) {
    return (
      <div className="border border-gray-200 rounded-md bg-white p-12 text-center w-full">
        <div className="w-12 h-12 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center mx-auto mb-3">
          <Receipt className="w-5 h-5 text-gray-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">
          No expenses recorded yet. Check back soon.
        </h3>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          {isAdmin 
            ? "Use the form above to add an expense and attach receipts." 
            : "No expenditure matching your active filters or ledger has been logged yet."}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* DESKTOP TABLE VIEW (lg and up): Tight Card container with vertical dividers */}
      <div className="hidden lg:block border border-gray-200 rounded-md overflow-hidden bg-white w-full">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-xs uppercase tracking-wider text-gray-500 font-semibold py-2.5 px-4 border-r border-gray-100 w-[110px]">
                  Date
                </th>
                <th className="text-xs uppercase tracking-wider text-gray-500 font-semibold py-2.5 px-4 border-r border-gray-100 min-w-[240px]">
                  Description
                </th>
                <th className="text-xs uppercase tracking-wider text-gray-500 font-semibold py-2.5 px-4 border-r border-gray-100 w-[130px]">
                  Category
                </th>
                <th className="text-xs uppercase tracking-wider text-gray-500 font-semibold py-2.5 px-4 border-r border-gray-100 text-right w-[150px]">
                  Amount
                </th>
                <th className="text-xs uppercase tracking-wider text-gray-500 font-semibold py-2.5 px-4 border-r border-gray-100 text-center w-[120px]">
                  Receipt
                </th>
                <th className={`text-xs uppercase tracking-wider text-gray-500 font-semibold py-2.5 px-4 min-w-[160px] ${isAdmin ? 'border-r border-gray-100' : ''}`}>
                  Notes
                </th>
                {isAdmin && (
                  <th className="text-xs uppercase tracking-wider text-gray-500 font-semibold py-2.5 px-4 text-right w-[90px]">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  {/* Date */}
                  <td className="py-3 px-4 text-xs font-medium text-gray-600 whitespace-nowrap border-r border-gray-100">
                    {expense.date}
                  </td>

                  {/* Description */}
                  <td className="py-3 px-4 text-sm font-medium text-gray-900 border-r border-gray-100">
                    {expense.description}
                  </td>

                  {/* Category outline badge */}
                  <td className="py-3 px-4 border-r border-gray-100">
                    <CategoryBadge
                      category={expense.category}
                      color={categoryColorMap[expense.category] || categoryColorMap[expense.category?.toLowerCase()]}
                    />
                  </td>

                  {/* Amount (font-mono, tabular-nums, right-aligned, bold navy) */}
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-sm font-semibold text-navy border-r border-gray-100">
                    {formatINR(expense.amount)}
                  </td>

                  {/* View Bill button: text-navy text-xs font-semibold uppercase tracking-wider hover:underline flex items-center gap-1 */}
                  <td className="py-3 px-4 text-center border-r border-gray-100">
                    {expense.bill_url ? (
                      <button
                        onClick={() => setSelectedReceipt(expense)}
                        className="inline-flex items-center justify-center gap-1 text-navy text-xs font-semibold uppercase tracking-wider hover:underline cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-navy" />
                        <span>View Bill</span>
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 font-normal">None</span>
                    )}
                  </td>

                  {/* Notes */}
                  <td className={`py-3 px-4 text-xs text-gray-500 max-w-xs truncate ${isAdmin ? 'border-r border-gray-100' : ''}`}>
                    {expense.notes || <span className="text-gray-300">-</span>}
                  </td>

                  {/* Admin Delete */}
                  {isAdmin && (
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onDelete(expense.id)}
                        className="text-xs text-gray-400 hover:text-red-600 font-medium cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {/* Total row at the bottom: bg-gray-50 border-t border-gray-200 py-3 px-4 */}
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={3} className="py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-semibold border-r border-gray-100">
                  TOTAL
                </td>
                <td className="py-3 px-4 text-right text-lg font-bold text-navy tabular-nums font-mono border-r border-gray-100">
                  {formatINR(totalAmount)}
                </td>
                <td colSpan={isAdmin ? 3 : 2} className="py-3 px-4 text-right text-xs text-gray-400">
                  {expenses.length} transaction{expenses.length === 1 ? "" : "s"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE EXPENSE CARDS (< lg breakpoint): Exact 3-row layout */}
      <div className="lg:hidden space-y-3 w-full">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="w-full border border-gray-200 rounded-lg p-4 bg-white space-y-3 box-border"
          >
            {/* Top row: Date (text-xs text-gray-500) on left, Category badge on right */}
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-gray-500 font-medium">{expense.date}</span>
              <CategoryBadge
                category={expense.category}
                color={categoryColorMap[expense.category] || categoryColorMap[expense.category?.toLowerCase()]}
              />
            </div>

            {/* Middle: Description (text-sm font-medium text-navy) */}
            <div className="text-sm font-medium text-navy leading-snug w-full">
              {expense.description}
            </div>

            {/* Bottom row: "Amount Spent" label + ₹ amount on left, "View Bill" button on right */}
            <div className="flex items-end justify-between border-t border-gray-100 pt-2.5 w-full">
              <div>
                <span className="block text-[11px] uppercase tracking-wider text-gray-500 font-medium">
                  Amount Spent
                </span>
                <span className="text-base font-semibold text-navy font-mono tabular-nums">
                  {formatINR(expense.amount)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {expense.bill_url ? (
                  <button
                    onClick={() => setSelectedReceipt(expense)}
                    className="inline-flex items-center gap-1 text-navy text-xs font-semibold uppercase tracking-wider hover:underline cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-navy" />
                    <span>View Bill</span>
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">No bill</span>
                )}

                {isAdmin && (
                  <button
                    onClick={() => onDelete(expense.id)}
                    className="text-xs text-gray-400 hover:text-red-600 font-medium cursor-pointer"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {expense.notes && (
              <div className="bg-gray-50 p-2.5 rounded text-xs text-gray-600 border border-gray-200 mt-2 w-full">
                <span className="font-medium text-gray-700">Note: </span>
                {expense.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Clean Receipt Modal */}
      <Dialog open={Boolean(selectedReceipt)} onOpenChange={() => setSelectedReceipt(null)}>
        {selectedReceipt && (
          <div className="p-1">
            <DialogClose onClick={() => setSelectedReceipt(null)} />
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-navy text-base font-semibold">
                <Receipt className="w-4 h-4 text-[#D4AF37]" />
                Proof of Expense
              </DialogTitle>
              <DialogDescription className="text-gray-500 text-xs mt-0.5">
                {selectedReceipt.description} • {formatINR(selectedReceipt.amount)} ({selectedReceipt.date})
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 max-h-[60vh] overflow-auto rounded border border-gray-200 bg-gray-50 flex items-center justify-center p-3">
              {selectedReceipt.bill_url?.endsWith(".pdf") ? (
                <div className="p-8 text-center space-y-3">
                  <FileText className="w-10 h-10 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-700 font-medium">PDF Invoice Attached</p>
                  <a
                    href={selectedReceipt.bill_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center px-4 py-2 bg-navy text-white rounded text-xs font-medium hover:bg-navy-dark"
                  >
                    Open PDF in Full Screen
                  </a>
                </div>
              ) : (
                <img
                  src={selectedReceipt.bill_url}
                  alt={`Proof for ${selectedReceipt.description}`}
                  className="max-h-[55vh] w-auto max-w-full object-contain rounded"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.src = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80"
                  }}
                />
              )}
            </div>

            {selectedReceipt.notes && (
              <div className="mb-4 p-2.5 bg-gray-50 rounded border border-gray-200 text-xs text-gray-600">
                <span className="font-medium text-gray-900">Notes: </span> {selectedReceipt.notes}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedReceipt(null)}
                className="text-xs h-8 rounded border-gray-200 text-gray-600 hover:text-gray-900"
              >
                Close
              </Button>
              <a
                href={selectedReceipt.bill_url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center justify-center h-8 rounded px-3 text-xs font-medium bg-navy text-white hover:bg-navy-dark"
              >
                Full Resolution
              </a>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  )
}
