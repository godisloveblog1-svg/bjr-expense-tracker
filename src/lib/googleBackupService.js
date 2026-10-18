/**
 * Optional off-site backup of transactions to Google Drive / Sheets.
 *
 * Setup steps live at the top of google-backup-script.js. The webhook URL is
 * configured with VITE_GOOGLE_BACKUP_WEBHOOK_URL (see .env.example).
 *
 * IMPORTANT: this is a convenience copy, NOT the source of truth. The Supabase
 * tables plus the audit trail are authoritative. Requests use mode "no-cors",
 * so a successful call only means "the request was sent" — delivery cannot be
 * confirmed from the browser.
 */

const GOOGLE_WEBHOOK_URL = import.meta.env.VITE_GOOGLE_BACKUP_WEBHOOK_URL || ""

export const isGoogleBackupConfigured = Boolean(
  GOOGLE_WEBHOOK_URL && GOOGLE_WEBHOOK_URL.startsWith("http")
)

let hasWarnedAboutMissingBackup = false

/**
 * Backup a single newly created transaction to Google Sheets & Drive.
 * Fails gracefully in the background without interrupting the main user flow.
 */
export async function backupTransactionToGoogle(record) {
  if (!isGoogleBackupConfigured) {
    if (!hasWarnedAboutMissingBackup) {
      hasWarnedAboutMissingBackup = true
      console.info(
        "Google Sheets backup is disabled (VITE_GOOGLE_BACKUP_WEBHOOK_URL not set). " +
          "Every change is still recorded in the Supabase audit trail."
      )
    }
    return { skipped: true, reason: "VITE_GOOGLE_BACKUP_WEBHOOK_URL not configured" }
  }

  try {
    // Mode no-cors allows browsers to POST cross-origin to Google Apps Script without CORS blockage
    await fetch(GOOGLE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(record),
      mode: "no-cors"
    })

    return { success: true }
  } catch (err) {
    console.warn("Google Drive backup notice:", err)
    return { success: false, error: err.message }
  }
}

/**
 * Copy the ENTIRE current ledger (expenses + funds + investments) to the
 * Google Sheet. Used by the "Back up all data now" button in the admin
 * Activity & Audit Trail tab. The Apps Script clears and rewrites its three
 * snapshot tabs, so the sheet mirrors the app exactly.
 */
export async function backupAllToGoogle(expenses = [], funds = [], investments = []) {
  if (!isGoogleBackupConfigured) {
    throw new Error(
      "Google backup is not configured. Add VITE_GOOGLE_BACKUP_WEBHOOK_URL and redeploy."
    )
  }

  // Tag each row so the script routes it to the right tab.
  const records = [
    ...expenses.map((row) => ({ ...row, kind: "expense" })),
    ...funds.map((row) => ({ ...row, kind: "fund" })),
    ...investments.map((row) => ({ ...row, kind: "investment" }))
  ]

  const options = {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ full: true, records })
  }

  try {
    // Apps Script web apps send CORS headers on their JSON responses, so with
    // mode "cors" we can actually READ the confirmation instead of guessing.
    const response = await fetch(GOOGLE_WEBHOOK_URL, { ...options, mode: "cors" })
    let result = null
    try {
      result = await response.json()
    } catch {
      result = null
    }

    if (!response.ok) {
      return { ok: false, error: `Google responded with status ${response.status}` }
    }
    if (result && result.status && result.status !== "success") {
      return { ok: false, error: result.message || "Google reported an error" }
    }

    return { ok: true, counts: result?.counts || null }
  } catch {
    // CORS could not be completed (opaque). Send fire-and-forget anyway and be
    // honest with the user that delivery must be verified in the sheet itself.
    await fetch(GOOGLE_WEBHOOK_URL, { ...options, mode: "no-cors" }).catch(() => {})
    return { ok: true, unverified: true }
  }
}
