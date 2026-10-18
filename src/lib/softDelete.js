import { supabase, isSupabaseConfigured } from "@/supabaseClient"

export const SOFT_DELETE_COLUMN = "deleted_at"

/**
 * True when the error is "there is no deleted_at column" — i.e. the
 * trust-layer SQL (supabase_setup_audit.sql) has not been applied yet.
 * The app stays usable in that state and simply degrades gracefully.
 */
export function isMissingDeletedAtColumn(error) {
  if (!error) return false
  const message = `${error.message || ""} ${error.details || ""} ${error.hint || ""}`
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes(SOFT_DELETE_COLUMN)
  )
}

/**
 * Soft-delete a row: mark it deleted instead of erasing it.
 * The row disappears from the ledger but stays in the audit trail
 * and can be restored from the Activity tab.
 *
 * Falls back to a real delete if the trust-layer SQL has not been run.
 */
export async function softDeleteRow(table, id) {
  if (!(isSupabaseConfigured && supabase)) return null

  const { data, error } = await supabase
    .from(table)
    .update({ [SOFT_DELETE_COLUMN]: new Date().toISOString() })
    .eq("id", id)
    .select()

  if (error && isMissingDeletedAtColumn(error)) {
    const { data: hardDeleted, error: hardError } = await supabase
      .from(table)
      .delete()
      .eq("id", id)
      .select()
    if (hardError) throw new Error(`Could not delete the record: ${hardError.message}`)
    return hardDeleted?.[0] ?? { id }
  }

  if (error) throw new Error(`Could not delete the record: ${error.message}`)
  if (!data || data.length === 0) {
    throw new Error(
      "Could not delete the record. Make sure you are signed in as an admin."
    )
  }
  return data[0]
}

/**
 * Read every row from a table, hiding soft-deleted ones.
 * Falls back to an unfiltered read before the trust-layer SQL is applied.
 */
export async function selectActiveRows(table) {
  if (!(isSupabaseConfigured && supabase)) return { data: [], supabaseReady: false }

  let { data, error } = await supabase
    .from(table)
    .select("*")
    .is(SOFT_DELETE_COLUMN, null)
    .order("id", { ascending: false })

  if (error && isMissingDeletedAtColumn(error)) {
    const retry = await supabase
      .from(table)
      .select("*")
      .order("id", { ascending: false })
    data = retry.data
    error = retry.error
  }

  if (error) throw new Error(error.message)
  return { data: (data || []).filter((row) => !row?.[SOFT_DELETE_COLUMN]), supabaseReady: true }
}
