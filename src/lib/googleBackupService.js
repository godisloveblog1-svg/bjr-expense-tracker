/**
 * Service to sync expense transactions directly to Google Drive / Google Sheets.
 */

const GOOGLE_WEBHOOK_URL = import.meta.env.VITE_GOOGLE_BACKUP_WEBHOOK_URL || ""

/**
 * Backup a single newly created transaction to Google Sheets & Drive.
 * Fails gracefully in the background without interrupting the main user flow.
 */
export async function backupTransactionToGoogle(record) {
  if (!GOOGLE_WEBHOOK_URL || !GOOGLE_WEBHOOK_URL.startsWith("http")) {
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
  if (!GOOGLE_WEBHOOK_URL || !GOOGLE_WEBHOOK_URL.startsWith("http")) {
    throw new Error("Google Backup Webhook URL is not configured. Add VITE_GOOGLE_BACKUP_WEBHOOK_URL to your environment.")
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
