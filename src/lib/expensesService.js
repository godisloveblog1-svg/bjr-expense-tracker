import { supabase, isSupabaseConfigured } from "@/supabaseClient"
import { isMissingDeletedAtColumn, selectActiveRows, SOFT_DELETE_COLUMN, softDeleteRow } from "@/lib/softDelete"

const LOCAL_KEY = "bjr_admin_expenses"

function getLocalExpenses() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []
  } catch {
    return []
  }
}

/**
 * Fetch expenses for the ledger.
 * Throws on failure so callers can show a real error state
 * instead of silently rendering ₹0 and looking like money vanished.
 */
export async function fetchExpenses() {
  if (!(isSupabaseConfigured && supabase)) return getLocalExpenses()

  const { data } = await selectActiveRows("expenses")
  return data
}

/**
 * Soft-delete an expense (kept in the audit trail, restorable).
 */
export async function deleteExpense(id) {
  if (!(isSupabaseConfigured && supabase)) {
    const updated = getLocalExpenses().filter((item) => item.id !== id)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated))
    return [id]
  }
  await softDeleteRow("expenses", id)
  return [id]
}

export { isMissingDeletedAtColumn, SOFT_DELETE_COLUMN }
