import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatINR } from "./utils"

/**
 * Loads an image URL and converts it to a base64 Data URL.
 */
async function getBase64ImageFromUrl(imageUrl) {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.warn("Could not load logo for PDF export:", err)
    return null
  }
}

export async function exportExpensesToPDF(expenses, clientName = "Client Ledger") {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  // BJR Group Palette:
  // Navy Blue: #0B2149 => [11, 33, 73]
  // Accent Gold: #D4AF37 => [212, 175, 55]
  // Light Gray: #F4F6F8 => [244, 246, 248]
  // Border Gray: [226, 230, 234]

  const navyRGB = [11, 33, 73]
  const goldRGB = [212, 175, 55]
  const lightGrayRGB = [244, 246, 248]
  const borderGrayRGB = [226, 230, 234]

  // Try loading and embedding BJR logo
  let hasImageLogo = false
  try {
    const logoBase64 = await getBase64ImageFromUrl("/logo.png")
    if (logoBase64) {
      // BJR Logo aspect ratio is exactly 3:1 (2172 x 724)
      const logoWidth = 45
      const logoHeight = 15
      doc.addImage(logoBase64, "PNG", 14, 12, logoWidth, logoHeight)
      hasImageLogo = true
    }
  } catch (e) {
    hasImageLogo = false
  }

  // If image logo failed, fallback to Navy text with small gold underline
  if (!hasImageLogo) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.setTextColor(...navyRGB)
    doc.text("BJR Group", 14, 20)

    doc.setDrawColor(...goldRGB)
    doc.setLineWidth(1)
    doc.line(14, 22, 55, 22)
  }

  // Header Subtitle & Tracking Info (positioned cleanly below logo / header)
  const headerTextStartY = hasImageLogo ? 32 : 28

  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(...navyRGB)
  doc.text("Client Expense Tracker", 14, headerTextStartY)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(90, 106, 128)
  doc.text("Every Rupee Accountable • Direct Receipt & Expenditure Audit Trail", 14, headerTextStartY + 5)

  const dateGenerated = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })
  doc.text(`Generated on: ${dateGenerated} | Client: ${clientName}`, 14, headerTextStartY + 10)

  // Gold accent separator bar
  const separatorY = headerTextStartY + 14
  doc.setDrawColor(...goldRGB)
  doc.setLineWidth(1.2)
  doc.line(14, separatorY, 196, separatorY)

  // Calculate totals
  const totalAmount = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const totalTransactions = expenses.length

  // Summary box
  const summaryBoxY = separatorY + 4
  doc.setFillColor(...lightGrayRGB)
  doc.setDrawColor(...borderGrayRGB)
  doc.roundedRect(14, summaryBoxY, 182, 18, 2, 2, "FD")
  
  doc.setFontSize(9.5)
  doc.setTextColor(...navyRGB)
  doc.text("Total Transactions:", 18, summaryBoxY + 11)
  doc.setFont("helvetica", "bold")
  doc.text(`${totalTransactions}`, 56, summaryBoxY + 11)

  doc.setFont("helvetica", "normal")
  doc.text("Total Cumulative Spend:", 100, summaryBoxY + 11)

  // Gold text for the total amount
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11.5)
  doc.setTextColor(...goldRGB)
  doc.text(`${formatINR(totalAmount)}`, 148, summaryBoxY + 11)

  // Prepare table data
  const tableRows = expenses.map((item, idx) => [
    idx + 1,
    item.date || "N/A",
    item.description || "N/A",
    item.category || "General",
    formatINR(item.amount),
    item.bill_url ? "Attached" : "None",
    item.notes || "-"
  ])

  autoTable(doc, {
    startY: summaryBoxY + 23,
    head: [["#", "Date", "Description", "Category", "Amount", "Proof", "Notes"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: navyRGB,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: navyRGB,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 24 },
      2: { cellWidth: 48 },
      3: { cellWidth: 22 },
      4: { cellWidth: 26, halign: "right", fontStyle: "bold", textColor: navyRGB },
      5: { cellWidth: 16, halign: "center" },
      6: { cellWidth: "auto" }
    },
    foot: [
      ["", "", "Total Cumulative Spend", "", formatINR(totalAmount), "", ""]
    ],
    footStyles: {
      fillColor: lightGrayRGB,
      textColor: goldRGB,
      fontStyle: "bold",
      fontSize: 9.5,
    }
  })

  // Footer notes on every page
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(120, 130, 140)
    doc.text(
      `BJR Group • Certified Digital Client Ledger • Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    )
  }

  doc.save(`BJR-Group-Expense-Ledger-${clientName.replace(/\s+/g, "_")}.pdf`)
}
