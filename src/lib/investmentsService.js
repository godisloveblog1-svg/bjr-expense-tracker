import { supabase, isSupabaseConfigured } from "@/supabaseClient"
import { selectActiveRows, softDeleteRow } from "@/lib/softDelete"

const LOCAL_KEY = "bjr_admin_investments"

function getLocalInvestments() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []
  } catch {
    return []
  }
}

/**
 * Fetch all investment entries (money poured into the startup by the investor).
 * Throws on failure so callers can show an honest error state instead of ₹0.
 */
export async function fetchInvestments() {
  if (!(isSupabaseConfigured && supabase)) return getLocalInvestments()

  const { data } = await selectActiveRows("investments")
  return data
}

/**
 * Upload a receipt file (image or PDF) for an investment entry to the shared `bills` bucket.
 * Returns the public URL, or null if no file / upload failed.
 */
export async function uploadInvestmentBill(file) {
  if (!file) return null
  if (!(isSupabaseConfigured && supabase)) return URL.createObjectURL(file)

  const fileExt = file.name.split(".").pop()
  const fileName = `investment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`

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
 * Add a new investment entry (e.g. investor drops capital into the startup).
 */
export async function addInvestment({ date, amount, note = "", bill_url = null }) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("investments")
      .insert([{ date, amount: parseFloat(amount), note, bill_url }])
      .select()

    if (error) throw new Error(`Database insert error: ${error.message}`)
    return data?.[0] || { date, amount: parseFloat(amount), note, bill_url }
  }

  const local = getLocalInvestments()
  const newRecord = { id: Date.now(), date, amount: parseFloat(amount), note, bill_url }
  const updated = [newRecord, ...local]
  localStorage.setItem(LOCAL_KEY, JSON.stringify(updated))
  return newRecord
}

/**
 * Update an existing investment entry (e.g. attach a receipt later).
 * Only the provided fields are changed.
 */
export async function updateInvestment(id, updates = {}) {
  const payload = {}
  if (updates.date !== undefined) payload.date = updates.date
  if (updates.amount !== undefined) payload.amount = parseFloat(updates.amount)
  if (updates.note !== undefined) payload.note = updates.note
  if (updates.bill_url !== undefined) payload.bill_url = updates.bill_url

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("investments")
      .update(payload)
      .eq("id", id)
      .select()

    if (error) throw new Error(`Database update error: ${error.message}`)
    return data?.[0]
  }

  const local = getLocalInvestments()
  const updated = local.map((inv) => (inv.id === id ? { ...inv, ...payload } : inv))
  localStorage.setItem(LOCAL_KEY, JSON.stringify(updated))
  return updated.find((inv) => inv.id === id)
}

/**
 * Delete an investment entry (soft delete: stays in the audit trail, restorable).
 */
export async function deleteInvestment(id) {
  if (!(isSupabaseConfigured && supabase)) {
    const updated = getLocalInvestments().filter((inv) => inv.id !== id)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated))
    return [id]
  }

  await softDeleteRow("investments", id)
  return [id]
}
