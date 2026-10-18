import { supabase, isSupabaseConfigured } from "@/supabaseClient"
import { SOFT_DELETE_COLUMN } from "@/lib/softDelete"

export const AUDIT_TABLES = ["expenses", "funds", "investments"]

export const TABLE_LABELS = {
  expenses: "Expense",
  funds: "Funds Received",
  investments: "Investment"
}

function isMissingTableError(error) {
  if (!error) return false
  const message = `${error.message || ""} ${error.details || ""}`
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("audit_log") ||
    message.includes("schema cache")
  )
}

/**
 * Recent changes across every money table.
 * Returns { entries, available, error } — `available: false` means the
 * audit SQL has not been applied to the database yet.
 */
export async function fetchAuditLog(limit = 100) {
  if (!(isSupabaseConfigured && supabase)) {
    return { entries: [], available: false, error: null }
  }

  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("happened_at", { ascending: false })
    .limit(limit)

  if (error) {
    if (isMissingTableError(error)) return { entries: [], available: false, error: null }
    return { entries: [], available: true, error: error.message }
  }
  return { entries: data || [], available: true, error: null }
}

/**
 * Rows that were deleted (soft-deleted) and can still be restored.
 * Requires the trust-layer SQL (see supabase_setup_audit.sql).
 */
export async function fetchDeletedRows() {
  if (!(isSupabaseConfigured && supabase)) {
    return { rows: [], available: false }
  }

  try {
    const results = await Promise.all(
      AUDIT_TABLES.map(async (table) => {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .not(SOFT_DELETE_COLUMN, "is", null)
          .order(SOFT_DELETE_COLUMN, { ascending: false })
          .limit(50)

        if (error) {
          const message = `${error.message || ""}`
          if (error.code === "42703" || error.code === "PGRST204" || message.includes(SOFT_DELETE_COLUMN)) {
            return { available: false, rows: [] }
          }
          throw new Error(error.message)
        }
        return {
          available: true,
          rows: (data || []).map((row) => ({ ...row, _table: table }))
        }
      })
    )

    const available = results.some((r) => r.available)
    const rows = results
      .flatMap((r) => r.rows)
      .sort((a, b) => String(b[SOFT_DELETE_COLUMN]).localeCompare(String(a[SOFT_DELETE_COLUMN])))
    return { rows, available }
  } catch (err) {
    return { rows: [], available: true, error: err.message }
  }
}

/**
 * Put a soft-deleted row back into the ledger.
 */
export async function restoreRow(table, id) {
  if (!(isSupabaseConfigured && supabase)) return null

  const { data, error } = await supabase
    .from(table)
    .update({ [SOFT_DELETE_COLUMN]: null })
    .eq("id", id)
    .select()

  if (error) throw new Error(`Could not restore the record: ${error.message}`)
  return data?.[0] ?? null
}
