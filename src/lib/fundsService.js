import { supabase, isSupabaseConfigured } from "@/supabaseClient"
import { selectActiveRows, softDeleteRow } from "@/lib/softDelete"

const LOCAL_KEY = "bjr_admin_funds"

function getLocalFunds() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []
  } catch {
    return []
  }
}

/**
 * Fetch all fund entries (money received from the client).
 * Throws on failure so callers can show an honest error state instead
 * of rendering ₹0 funds and looking like the money disappeared.
 */
export async function fetchFunds() {
  if (!(isSupabaseConfigured && supabase)) return getLocalFunds()

  const { data } = await selectActiveRows("funds")
  return data
}

/**
 * Upload a receipt file (image or PDF) for a fund entry to the shared `bills` bucket.
 * Returns the public URL, or null if no file / upload failed.
 */
export async function uploadFundBill(file) {
  if (!file) return null
  if (!(isSupabaseConfigured && supabase)) return URL.createObjectURL(file)

  const fileExt = file.name.split(".").pop()
  const fileName = `fund-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from("bills")
    .upload(fileName, file)

  if (uploadError) {
    throw new Error(`File upload failed: ${uploadError.message}`)
  }

  const { data: publicUrlData } = supabase.storage
    .from("bills")
    .getPublicUrl(fileName)

  return publicUrlData?.publicUrl || null
}

/**
 * Add a new fund entry (e.g. client handed over money).
 */
export async function addFund({ date, amount, note = "", bill_url = null }) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("funds")
      .insert([{ date, amount: parseFloat(amount), note, bill_url }])
      .select()

    if (error) throw new Error(`Database insert error: ${error.message}`)
    return data?.[0] || { date, amount: parseFloat(amount), note, bill_url }
  }

  const local = getLocalFunds()
  const newRecord = { id: Date.now(), date, amount: parseFloat(amount), note, bill_url }
  const updated = [newRecord, ...local]
  localStorage.setItem(LOCAL_KEY, JSON.stringify(updated))
  return newRecord
}

/**
 * Update an existing fund entry (e.g. attach a receipt later).
 * Only the provided fields are changed.
 */
export async function updateFund(id, updates = {}) {
  const payload = {}
  if (updates.date !== undefined) payload.date = updates.date
  if (updates.amount !== undefined) payload.amount = parseFloat(updates.amount)
  if (updates.note !== undefined) payload.note = updates.note
  if (updates.bill_url !== undefined) payload.bill_url = updates.bill_url

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("funds")
      .update(payload)
      .eq("id", id)
      .select()

    if (error) throw new Error(`Database update error: ${error.message}`)
    return data?.[0]
  }

  const local = getLocalFunds()
  const updated = local.map((f) => (f.id === id ? { ...f, ...payload } : f))
  localStorage.setItem(LOCAL_KEY, JSON.stringify(updated))
  return updated.find((f) => f.id === id)
}

/**
 * Delete a fund entry (soft delete: stays in the audit trail, restorable).
 */
export async function deleteFund(id) {
  if (!(isSupabaseConfigured && supabase)) {
    const updated = getLocalFunds().filter((f) => f.id !== id)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated))
    return [id]
  }

  await softDeleteRow("funds", id)
  return [id]
}
