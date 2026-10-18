/**
 * Google Apps Script — BJR Expense Tracker → Google Sheets backup
 * ───────────────────────────────────────────────────────────────
 * THE APP POSTS TO THIS SCRIPT IN TWO WAYS:
 *   1. Every time you add or edit a transaction in the admin panel, one row is
 *      appended to the "Backup Log" tab (type, action, all fields, timestamp).
 *   2. When you press "Back up all data now" (admin → Activity & Audit Trail),
 *      the whole current ledger is written into three snapshot tabs:
 *      "Expenses", "Funds Received" and "Investments" — they are cleared and
 *      rewritten, so they are always an exact mirror of the app.
 * Receipts referenced in the ledger are copied into Google Drive when a row is
 * added or edited (not during full syncs — those link the Supabase receipt).
 *
 * ── FIRST-TIME SETUP (about 3 minutes) ──────────────────────────────────────
 * 1. Open Google Drive (drive.google.com).
 * 2. Create a new Google Sheet named "BJR Expense Tracker Backup".
 * 3. Inside the sheet click Extensions → Apps Script.
 * 4. Delete everything in the script editor and paste THIS ENTIRE FILE.
 * 5. (Optional) Create a Drive folder "BJR Expense Receipts", put its folder ID
 *    in DRIVE_FOLDER_ID below. Leave "" to store copies next to the spreadsheet.
 * 6. Deploy → New deployment → gear icon → Web app.
 *      Description: "BJR Expense Backup Webhook"
 *      Execute as:  Me (your email)
 *      Who has access: Anyone        ← crucial, so the app can post to it
 * 7. Deploy, review permissions, then copy the /exec Web app URL.
 * 8. Give that URL to the developer (or set it yourself):
 *      - Vercel → Project Settings → Environment Variables →
 *        VITE_GOOGLE_BACKUP_WEBHOOK_URL = <the URL>  → then redeploy
 *      - local .env → same key → restart `npm run dev`
 * 9. Test: click the admin "Back up all data now" button once — all three
 *    snapshot tabs fill up. (A webhook that posts nothing yet still works.)
 *
 * ── UPDATING TO A NEW VERSION OF THIS SCRIPT (important!) ───────────────────
 * If this script changes later, pasting new code into the editor is NOT enough.
 * Go to Deploy → Manage deployments →  ✎ Edit → Version: New version → Deploy.
 * The web app URL stays the same.
 *
 * Both POST bodies (single event and full sync) and the response are JSON.
 */

// Optional Drive folder for receipt copies. "" = beside the spreadsheet.
const DRIVE_FOLDER_ID = "";

const HEADER_STYLES = {
  log: ["Backup time", "Type", "Action", "Record ID", "Date",
    "Description / Note", "Category", "Amount (INR)",
    "Bill (Supabase)", "Receipt copy (Drive)"],
  expenses: ["Record ID", "Date", "Description", "Category",
    "Amount (INR)", "Bill (Supabase)", "Backup time"],
  funds: ["Record ID", "Date", "Amount (INR)", "Note", "Bill (Supabase)", "Backup time"],
  investments: ["Record ID", "Date", "Amount (INR)", "Note", "Bill (Supabase)", "Backup time"]
};

const HEAD_ROW_BG = "#0B2149";

/* ── Web entry points ─────────────────────────────────────────────────── */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    const stamp = new Date().toISOString();

    if (data.full) {
      return fullSync_(Array.isArray(data.records) ? data.records : [], stamp);
    }

    // Single events: one record, or { records: [...] }
    const records = Array.isArray(data) ? data : (data.records || [data]);
    return appendEvents_(records, stamp);
  } catch (error) {
    return json_({ status: "error", message: String(error) });
  }
}

// GET the /exec URL to check the webhook is alive without sending data.
function doGet(e) {
  return json_({ status: "active", message: "BJR backup webhook is ready." });
}

/* ── Modes ───────────────────────────────────────────────────────────── */

function appendEvents_(records, stamp) {
  const log = ensureSheet_("Backup Log", HEADER_STYLES.log);
  let appended = 0;

  records.forEach(function (item) {
    const kind = kindOf_(item);
    const action = /update/i.test(String(item.kind || item.type || "")) ? "edited" : "added";
    const driveCopy = copyReceiptToDrive_(item);
    log.appendRow([
      stamp,
      kind,
      action,
      item.id || "",
      item.date || "",
      titleOf_(item),
      item.category || "",
      Number(item.amount) || 0,
      item.bill_url || "",
      driveCopy
    ]);
    appended++;
  });

  return json_({ status: "success", appended: appended });
}

function fullSync_(records, stamp) {
  const buckets = { expense: [], fund: [], investment: [] };
  records.forEach(function (item) {
    buckets[kindOf_(item)].push(item);
  });

  const rows = {
    expense: buckets.expense.map(expenseRow_),
    fund: buckets.fund.map(fundRow_),
    investment: buckets.investment.map(investmentRow_)
  };

  rewriteSheet_(ensureSheet_("Expenses", HEADER_STYLES.expenses), rows.expense);
  rewriteSheet_(ensureSheet_("Funds Received", HEADER_STYLES.funds), rows.fund);
  rewriteSheet_(ensureSheet_("Investments", HEADER_STYLES.investments), rows.investment);

  const log = ensureSheet_("Backup Log", HEADER_STYLES.log);
  log.appendRow([
    stamp, "-", "full backup",
    "" , "",
    `${rows.expense.length} expenses ⋅ ${rows.fund.length} funds ⋅ ${rows.investment.length} investments`,
    "", "", "", ""
  ]);

  return json_({
    status: "success",
    counts: { expense: rows.expense.length, fund: rows.fund.length, investment: rows.investment.length }
  });
}

/* ── Row mappers ─────────────────────────────────────────────────────── */

function expenseRow_(item) {
  return [item.id || "", item.date || "", titleOf_(item), item.category || "",
    Number(item.amount) || 0, item.bill_url || "", new Date().toISOString()];
}

function fundRow_(item) {
  return [item.id || "", item.date || "", item.note || "", Number(item.amount) || 0,
    item.bill_url || "", new Date().toISOString()];
}

function investmentRow_(item) {
  return [item.id || "", item.date || "", item.note || "", Number(item.amount) || 0,
    item.bill_url || "", new Date().toISOString()];
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

// "fund_update" → fund, "investment" → investment, anything else → expense
function kindOf_(item) {
  const raw = String(item.kind || item.type || "expense").toLowerCase();
  if (raw.indexOf("fund") !== -1) return "fund";
  if (raw.indexOf("investment") !== -1) return "investment";
  return "expense";
}

function titleOf_(item) {
  return item.description || item.note || item.notes || "";
}

function ensureSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    const head = sheet.getRange(1, 1, 1, headers.length);
    head.setBackground(HEAD_ROW_BG).setFontColor("#FFFFFF").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Exact-mirror rewrite: clear everything below the frozen header, then append.
function rewriteSheet_(sheet, rows) {
  const last = sheet.getLastRow();
  if (last > 1) sheet.deleteRows(2, last - 1);
  if (rows.length) sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function copyReceiptToDrive_(item) {
  if (!item.bill_url || String(item.bill_url).indexOf("http") !== 0) return "";
  try {
    const blob = UrlFetchApp.fetch(item.bill_url).getBlob();
    const safeTitle = titleOf_(item).replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30) || "receipt";
    const ext = String(blob.getContentType()).indexOf("pdf") !== -1 ? ".pdf" : ".jpg";
    blob.setName((item.date || "receipt") + "_" + safeTitle + ext);
    const folder = receiptsFolder_();
    return folder ? String(folder.createFile(blob).getUrl()) : "";
  } catch (err) {
    return "copy failed: " + err;
  }
}

function receiptsFolder_() {
  if (DRIVE_FOLDER_ID && String(DRIVE_FOLDER_ID).trim() !== "") {
    return DriveApp.getFolderById(DRIVE_FOLDER_ID);
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const parents = DriveApp.getFileById(ss.getId()).getParents();
  return parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
