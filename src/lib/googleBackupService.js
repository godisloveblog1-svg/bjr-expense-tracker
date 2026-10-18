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
 * Sync all existing transactions to Google Drive in bulk.
 */
export async function syncAllToGoogle(expensesList) {
  if (!isGoogleBackupConfigured) {
    throw new Error(
      "Google Backup Webhook URL is not configured. Add VITE_GOOGLE_BACKUP_WEBHOOK_URL to your environment."
    )
  }

  await fetch(GOOGLE_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({ records: expensesList }),
    mode: "no-cors"
  })

  return true
}
