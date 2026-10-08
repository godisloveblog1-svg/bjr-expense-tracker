import { supabase, isSupabaseConfigured } from "@/supabaseClient"

export const DEFAULT_CATEGORIES = [
  { name: "Domain", color: "#0B2149" },
  { name: "Hosting", color: "#0B2149" },
  { name: "Design", color: "#0B2149" },
  { name: "Travel", color: "#0B2149" },
  { name: "Software", color: "#0B2149" },
  { name: "Hardware", color: "#0B2149" },
  { name: "Misc", color: "#0B2149" }
]

const LOCAL_STORAGE_KEY = "bjr_categories_cache"

function getLocalCategories() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {
    console.warn("Failed to load local categories:", e)
  }
  return DEFAULT_CATEGORIES.map((c, i) => ({ id: i + 1, ...c }))
}

function saveLocalCategories(cats) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cats))
  } catch (e) {
    console.warn("Failed to save local categories:", e)
  }
}

/**
 * Fetch all categories from Supabase (or localStorage fallback).
 * Auto-seeds with default categories if empty.
 */
export async function fetchCategories() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true })

      if (error) {
        // Table might not exist yet or connection issue
        console.warn("Supabase fetch categories notice (using local fallback):", error.message)
        return getLocalCategories()
      }

      // If empty in Supabase, auto-seed defaults
      if (!data || data.length === 0) {
        const { data: seeded, error: seedError } = await supabase
          .from("categories")
          .insert(DEFAULT_CATEGORIES)
          .select()

        if (!seedError && seeded && seeded.length > 0) {
          saveLocalCategories(seeded)
          return seeded
        }
        return getLocalCategories()
      }

      saveLocalCategories(data)
      return data
    } catch (err) {
      console.warn("Categories fetch exception:", err)
      return getLocalCategories()
    }
  }

  return getLocalCategories()
}

/**
 * Add a new category to Supabase (or local fallback).
 */
export async function addCategory(name, color = "#0B2149") {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Category name is required")

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert([{ name: trimmed, color }])
        .select()
        .single()

      if (!error && data) {
        const current = getLocalCategories()
        saveLocalCategories([...current.filter(c => c.name !== trimmed), data])
        return data
      }
      if (error && error.code !== "PGRST205") {
        throw new Error(error.message)
      }
    } catch (e) {
      if (e.message && !e.message.includes("schema cache")) {
        throw e
      }
    }
  }

  // Fallback local save
  const current = getLocalCategories()
  if (current.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error("Category already exists")
  }
  const newCat = { id: Date.now(), name: trimmed, color }
  const updated = [...current, newCat].sort((a, b) => a.name.localeCompare(b.name))
  saveLocalCategories(updated)
  return newCat
}

/**
 * Delete a category from Supabase (or local fallback).
 */
export async function deleteCategory(id, name) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)

      if (error && error.code !== "PGRST205") {
        throw new Error(error.message)
      }
    } catch (e) {
      if (e.message && !e.message.includes("schema cache")) {
        throw e
      }
    }
  }

  const current = getLocalCategories()
  const updated = current.filter(c => c.id !== id && c.name !== name)
  saveLocalCategories(updated)
  return true
}
