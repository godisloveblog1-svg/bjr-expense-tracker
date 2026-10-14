/**
 * Google Apps Script for Automated BJR Expense Backups
 *
 * HOW TO SETUP (Takes 2 minutes):
 * 1. Open Google Drive (drive.google.com).
 * 2. Create a new Google Sheet named "BJR Expense Tracker Backup".
 * 3. Inside the sheet, click "Extensions" -> "Apps Script".
 * 4. Replace everything in the script editor with THIS exact code.
 * 5. (Optional) Create a folder in Google Drive named "BJR Expense Receipts" and paste its folder ID below in DRIVE_FOLDER_ID.
 * 6. Click "Deploy" (top right) -> "New deployment".
 * 7. Click the gear icon next to "Select type" -> choose "Web app".
 * 8. Configuration:
 *    - Description: "BJR Expense Backup Webhook"
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone" (crucial so your app can post to it)
 * 9. Click "Deploy", review permissions, and copy the Web App URL (starts with https://script.google.com/macros/s/...).
 * 10. Add the URL to your project:
 *     In .env and Vercel environment variables:
 *     VITE_GOOGLE_BACKUP_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
 */

// OPTIONAL: If you want bill images saved to a specific Google Drive folder, paste the folder ID here.
// Leave as empty string "" to save directly in the folder containing this spreadsheet.
const DRIVE_FOLDER_ID = "";

function doPost(e) {
  try {
    const rawData = e.postData.contents;
    const data = JSON.parse(rawData);

    // Support single record or bulk sync array
    const records = Array.isArray(data) ? data : (data.records || [data]);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Expenses");

    // Create and format sheet if it does not exist
    if (!sheet) {
      sheet = ss.insertSheet("Expenses");
      const headers = [
        "Record ID",
        "Date",
        "Description",
        "Category",
        "Amount (INR)",
        "Notes",
        "Supabase Bill URL",
        "Google Drive Bill File",
        "Backup Timestamp"
      ];
      sheet.appendRow(headers);
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#0B2149");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    // Determine target folder for receipts
    let folder;
    if (DRIVE_FOLDER_ID && DRIVE_FOLDER_ID.trim() !== "") {
      folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    } else {
      const parentFolders = DriveApp.getFileById(ss.getId()).getParents();
      folder = parentFolders.hasNext() ? parentFolders.next() : DriveApp.getRootFolder();
    }

    // Process each transaction
    records.forEach(function (item) {
      let gdriveFileUrl = "";

      // If a bill URL is provided, copy the receipt to Google Drive
      if (item.bill_url && item.bill_url.startsWith("http")) {
        try {
          const response = UrlFetchApp.fetch(item.bill_url);
          const blob = response.getBlob();
          const cleanDesc = (item.description || "expense").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
          const ext = blob.getContentType().indexOf("pdf") !== -1 ? ".pdf" : ".jpg";
          blob.setName((item.date || "date") + "_" + cleanDesc + ext);
          const driveFile = folder.createFile(blob);
          gdriveFileUrl = driveFile.getUrl();
        } catch (fileErr) {
          gdriveFileUrl = "Failed to copy: " + fileErr.toString();
        }
      }

      sheet.appendRow([
        item.id || "",
        item.date || "",
        item.description || "",
        item.category || "",
        item.amount || 0,
        item.notes || "",
        item.bill_url || "None",
        gdriveFileUrl || "None",
        new Date().toISOString()
      ]);
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", count: records.length }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Allow GET for testing webhook health
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "active", message: "BJR Google Backup Webhook is ready." }))
    .setMimeType(ContentService.MimeType.JSON);
}
