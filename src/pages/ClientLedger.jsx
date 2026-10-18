import React, { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import Sidebar from "@/components/Sidebar"
import ExpenseTable from "@/components/ExpenseTable"
import { fetchCategories } from "@/lib/categoriesService"
import { fetchExpenses } from "@/lib/expensesService"
import { fetchFunds } from "@/lib/fundsService"
import { fetchInvestments } from "@/lib/investmentsService"
import { exportExpensesToPDF } from "@/lib/pdfExport"
import { formatINR, formatTransactionCount } from "@/lib/utils"
import { AlertCircle, Download, Search, TrendingUp, Wallet, Rocket, RefreshCw } from "lucide-react"
import { Select } from "@/components/ui/input"
import logo from "@/assets/logo.png"

const VALID_CLIENT_SLUG = "x7k9m2p4q8v3"

export default function ClientLedger() {
  const { clientSlug } = useParams()
  const [expenses, setExpenses] = useState([])
  const [funds, setFunds] = useState([])
  const [investments, setInvestments] = useState([])
  const [categoriesList, setCategoriesList] = useState([])
  const [loading, setLoading] = useState(true)
  // Per-source load state: a failed fetch must never be shown as ₹0
  const [loadState, setLoadState] = useState({ expenses: "loading", funds: "loading", investments: "loading" })
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [activeView, setActiveView] = useState("expenses") // "expenses" | "investments"

  const isValidSlug = clientSlug === VALID_CLIENT_SLUG

  // Load categories dynamically from Supabase
  useEffect(() => {
    async function loadCats() {
      try {
        const cats = await fetchCategories()
        setCategoriesList(cats)
      } catch (err) {
        console.warn("Failed to load dynamic categories:", err)
      }
    }
    loadCats()
  }, [])

  // Create category color lookup map
  const categoryColorMap = React.useMemo(() => {
    const map = {}
    categoriesList.forEach((c) => {
      if (c.name && c.color) {
        map[c.name] = c.color
        map[c.name.toLowerCase()] = c.color
      }
    })
    return map
  }, [categoriesList])

  const categoryNames = categoriesList.map((c) => c.name)

  // Load everything the ledger needs — all three in parallel so the figures
  // settle together (a sequential load briefly showed a wrong Total Invested).
  // Each source reports its own state so a failure shows as "unavailable",
  // never as a misleading ₹0.
  const loadLedger = async () => {
    setLoading(true)
    setLoadState({ expenses: "loading", funds: "loading", investments: "loading" })

    const [expensesResult, fundsResult, investmentsResult] = await Promise.allSettled([
      fetchExpenses(),
      fetchFunds(),
      fetchInvestments()
    ])

    if (expensesResult.status === "fulfilled") {
      setExpenses(expensesResult.value || [])
      setLoadState((prev) => ({ ...prev, expenses: "ready" }))
    } else {
      console.error("Failed to load expenses:", expensesResult.reason)
      setLoadState((prev) => ({ ...prev, expenses: "error" }))
    }

    if (fundsResult.status === "fulfilled") {
      setFunds(fundsResult.value || [])
      setLoadState((prev) => ({ ...prev, funds: "ready" }))
    } else {
      console.warn("Failed to load funds:", fundsResult.reason)
      setLoadState((prev) => ({ ...prev, funds: "error" }))
    }

    if (investmentsResult.status === "fulfilled") {
      setInvestments(investmentsResult.value || [])
      setLoadState((prev) => ({ ...prev, investments: "ready" }))
    } else {
      console.warn("Failed to load investments:", investmentsResult.reason)
      setLoadState((prev) => ({ ...prev, investments: "error" }))
    }

    // "Last updated" only moves forward on a fully successful refresh
    if ([expensesResult, fundsResult, investmentsResult].every((r) => r.status === "fulfilled")) {
      setLastSyncedAt(new Date())
    }
    setLoading(false)
  }

  useEffect(() => {
    loadLedger()
  }, [clientSlug])

  const filteredExpenses = expenses.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" ||
      (item.category || "").toLowerCase() === selectedCategory.toLowerCase()

    const search = searchTerm.toLowerCase().trim()
    const matchesSearch =
      !search ||
      (item.description || "").toLowerCase().includes(search) ||
      (item.notes || "").toLowerCase().includes(search) ||
      (item.date || "").toLowerCase().includes(search) ||
      String(item.amount || "").includes(search)

    return matchesCategory && matchesSearch
  })

  // Stat metrics
  const totalSpent = filteredExpenses.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  )
  const totalTransactions = filteredExpenses.length

  // Balance math: money the client gave minus everything spent
  const totalFunds = funds.reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
  const balance = totalFunds - totalSpent
  const isLowBalance = balance <= 0

  // Honest availability flags: show "—" rather than a false ₹0
  const fundsUnavailable = loadState.funds === "error"
  const expensesUnavailable = loadState.expenses === "error"
  const investmentsUnavailable = loadState.investments === "error"
  const hasSyncIssue = fundsUnavailable || expensesUnavailable || investmentsUnavailable
  const balanceUnavailable = fundsUnavailable || expensesUnavailable
  const lastUpdatedText = lastSyncedAt
    ? `Last updated ${lastSyncedAt.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })}`
    : hasSyncIssue
      ? "Live data unavailable"
      : "Syncing…"

  // Investment math: every expense auto-counts as capital deployed into the project,
  // plus directly-uploaded non-expense investments
  const investmentEntriesTotal = investments.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)
  const totalInvested = totalSpent + investmentEntriesTotal

  const handleDownloadPDF = () => {
    exportExpensesToPDF(filteredExpenses, clientSlug || "BJR-Client", {
      totalFunds,
      balance,
      totalInvested,
      investments: investmentRows
    })
  }

  // Total Investments view lists ONLY direct investments (uploads from admin).
  // Expenses are itemized separately in All Expenses, but still count toward the Total Invested figure.
  const investmentRows = React.useMemo(() => {
    const parseDate = (d) => {
      const t = Date.parse(d || "")
      return isNaN(t) ? 0 : t
    }

    return investments
      .map((inv) => ({
        id: `investment-${inv.id}`,
        date: inv.date,
        description: inv.note || "Startup Investment (Direct Funding)",
        category: "Investment",
        amount: inv.amount,
        notes: inv.note ? "Direct capital invested into the project" : "",
        bill_url: inv.bill_url
      }))
      .sort((a, b) => parseDate(b.date) - parseDate(a.date))
  }, [investments])

  const directInvestmentsTotal = investmentRows.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  // Gold badge for direct investments, normal colors for expense categories
  const investmentColorMap = React.useMemo(
    () => ({ ...categoryColorMap, Investment: "#D4AF37", investment: "#D4AF37" }),
    [categoryColorMap]
  )

  const filteredInvestmentRows = investmentRows.filter((item) => {
    const search = searchTerm.toLowerCase().trim()
    if (!search) return true
    return (
      (item.description || "").toLowerCase().includes(search) ||
      (item.notes || "").toLowerCase().includes(search) ||
      (item.date || "").toLowerCase().includes(search) ||
      (item.category || "").toLowerCase().includes(search) ||
      String(item.amount || "").includes(search)
    )
  })

  if (!isValidSlug) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-md border border-gray-200 max-w-md text-center">
          <div className="w-10 h-10 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-5 h-5 text-gray-500" />
          </div>
          <h2 className="text-[16px] font-semibold text-gray-900 mb-1">Client Ledger Not Found</h2>
          <p className="text-[13px] text-gray-500 mb-6">
            This ledger link is not valid. Please use the private URL provided to you.
          </p>
          <Link
            to="/"
            className="block w-full py-2 px-4 bg-navy hover:bg-navy-dark text-white font-medium rounded-md text-[13px]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-gray-900 pb-24 lg:pb-0">
      {/* HEADER CONTAINER: ONLY THE LOGO — NOTHING ELSE */}
      <header className="flex items-center justify-center w-full bg-white border-b border-gray-200 h-24 md:h-40 px-4 m-0 z-30 shrink-0">
        <Link to="/" className="flex items-center justify-center">
          <img
            src={logo}
            alt="BJR Group"
            className="h-24 md:h-32 w-auto object-contain block"
          />
        </Link>
      </header>

      {/* TWO-COLUMN LAYOUT ON DESKTOP */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0 w-full">
        <Sidebar
          totalSpent={totalSpent}
          balance={balance}
          transactionCount={totalTransactions}
          activeView={activeView}
          onSelectView={setActiveView}
          investmentCount={investments.length}
          onDownloadReport={handleDownloadPDF}
          clientSlug={clientSlug}
          isOpen={false}
          onClose={() => {}}
          hideHeaderLogo={true}
        />

        {/* Right Main Content Area */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 pb-12 lg:pb-6 space-y-4 sm:space-y-6 max-w-6xl w-full mx-auto min-w-0">
          {/* Subheading row */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-navy tracking-tight">
                David's Expense Tracker
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Every Rupee Accountable
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{lastUpdatedText}</p>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              {hasSyncIssue ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-red-600">
                    Sync issue
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-gray-600">
                    Live &amp; Verified
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Sync warning: never let a failed load read as missing money */}
          {hasSyncIssue && (
            <div className="p-3.5 rounded-md text-[13px] font-medium flex flex-col sm:flex-row sm:items-center gap-2 border bg-white text-amber-900 border-amber-300">
              <div className="flex items-start gap-2 flex-1">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Some live figures could not be loaded, so they show as “—” instead of ₹0.
                  {lastSyncedAt ? " Values shown are the last ones that loaded successfully." : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={loadLedger}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-md hover:bg-amber-100 shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* THE BALANCE BOX */}
          <div className="relative overflow-hidden rounded-md border border-[#D4AF37]/60 border-l-4 border-l-[#D4AF37] bg-gradient-to-br from-[#0B2149] via-[#0E2856] to-[#123168] p-4.5 sm:p-6 lg:p-7 text-white shadow-md">
            {/* Ambient decorative glow / pattern */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

            {/* Top row */}
            <div className="flex items-center justify-between mb-2.5 sm:mb-4">
              <span className="text-[11px] font-semibold tracking-wider text-[#D4AF37] uppercase">
                {balanceUnavailable ? "BALANCE UNAVAILABLE" : isLowBalance ? "⚠ LOW / NO BALANCE" : "BALANCE LEFT"}
              </span>
              <div className="flex items-center gap-2">
                {balanceUnavailable ? (
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
                <span className="text-[11px] font-medium uppercase tracking-wider text-gray-300">
                  {balanceUnavailable ? "Retry needed" : "Live Sync"}
                </span>
              </div>
            </div>

            {/* Center Massive Amount */}
            <div className="my-1 sm:my-2">
              <span
                className={`text-3xl sm:text-5xl lg:text-6xl font-bold font-mono tracking-tight tabular-nums block ${
                  balanceUnavailable ? "text-gray-400" : isLowBalance ? "text-red-400" : "text-white"
                }`}
              >
                {balanceUnavailable ? "—" : formatINR(balance)}
              </span>
            </div>

            {/* Funds vs Spent vs Invested sub-stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 sm:mt-4">
              <div className="rounded-md bg-white/5 border border-white/10 px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-300 block">
                  Total Funds
                </span>
                <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-emerald-300 block mt-0.5">
                  {fundsUnavailable ? "—" : formatINR(totalFunds)}
                </span>
              </div>
              <div className="rounded-md bg-white/5 border border-white/10 px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-300 block">
                  Total Spent
                </span>
                <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-white block mt-0.5">
                  {expensesUnavailable ? "—" : formatINR(totalSpent)}
                </span>
              </div>
              <div className="rounded-md bg-white/5 border border-white/10 px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#D4AF37] block">
                  Total Invested
                </span>
                <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-[#D4AF37] block mt-0.5">
                  {investmentsUnavailable || expensesUnavailable ? "—" : formatINR(totalInvested)}
                </span>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="flex items-center justify-between border-t border-white/10 pt-3 sm:pt-4 mt-3 sm:mt-4">
              <span className="text-xs text-gray-300 font-normal">
                {expensesUnavailable
                  ? "Transaction count unavailable"
                  : formatTransactionCount(totalTransactions)}
              </span>

              {/* Bottom Right: Sleek minimal trend sparkline icon colored in Gold */}
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#D4AF37]">
                <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                <svg
                  className="w-16 h-5 text-[#D4AF37]"
                  viewBox="0 0 64 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="2,16 16,13 28,15 42,7 54,9 62,3" />
                </svg>
              </div>
            </div>
          </div>

          {/* TABLE TOOLBAR & SEARCH (Just above table header in a clean row) */}
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div>
                <h2 className="text-[15px] font-semibold text-navy tracking-tight">
                  {activeView === "investments" ? "Itemized Investments" : "Itemized Expenses"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {activeView === "investments"
                    ? "Investments made outside of expenses — itemized spend lives in All Expenses and still counts toward Total Invested"
                    : "Verified invoices with original receipt attachments"}
                </p>
              </div>

              {/* Clean search bar & categories dropdown toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Search input */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={activeView === "investments" ? "Search investments..." : "Search expenses..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy"
                  />
                </div>

                {/* Category select from categories table (expenses view only) */}
                {activeView === "expenses" && (
                  <div className="w-full sm:w-40">
                    <Select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="h-8 text-xs rounded-md border-gray-200 bg-white text-gray-700 font-medium focus:border-navy focus:ring-1 focus:ring-navy w-full"
                    >
                      <option value="all">All Categories</option>
                      {categoryNames.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Investments breakdown chips */}
            {activeView === "investments" && (
              <div className="flex flex-wrap items-center gap-2 pb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[11px] font-semibold text-[#8a6d1f]">
                  <Rocket className="w-3 h-3" />
                  Direct investments (listed below): {formatINR(directInvestmentsTotal)}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-navy/5 border border-navy/15 text-[11px] font-semibold text-navy">
                  <TrendingUp className="w-3 h-3" />
                  Auto from expenses (see All Expenses): {formatINR(totalSpent)}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
                  Total Invested: {formatINR(totalInvested)}
                </span>
              </div>
            )}

            {/* Table Container: Dense, bordered */}
            {loading ? (
              <div className="rounded-md border border-gray-200 bg-white p-12 text-center text-gray-500 text-xs">
                Loading verified transactions...
              </div>
            ) : (activeView === "expenses" && expensesUnavailable) ||
              (activeView === "investments" && investmentsUnavailable) ? (
              <div className="rounded-md border border-amber-200 bg-white p-12 text-center">
                <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                <p className="text-xs text-gray-700 font-medium">
                  Couldn&apos;t load {activeView === "investments" ? "investments" : "expenses"}.
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Nothing has been lost — the data simply didn&apos;t load. Retry to see the latest ledger.
                </p>
                <button
                  type="button"
                  onClick={loadLedger}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-navy bg-white border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
            ) : activeView === "investments" ? (
              <ExpenseTable
                expenses={filteredInvestmentRows}
                isAdmin={false}
                categoryColorMap={investmentColorMap}
                amountLabel="Amount Invested"
                totalLabel="TOTAL INVESTED (DIRECT)"
                emptyTitle="No direct investments recorded yet."
                emptyHint="Investments made outside of expenses will appear here. Expenses are itemized in All Expenses and still count toward Total Invested."
              />
            ) : (
              <ExpenseTable
                expenses={filteredExpenses}
                isAdmin={false}
                categoryColorMap={categoryColorMap}
              />
            )}
          </div>
        </main>
      </div>

      {/* MOBILE STICKY BOTTOM FOOTER (< lg breakpoint): Shows Balance & amount */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block flex items-center gap-1">
            <Wallet className="w-3 h-3" />
            {balanceUnavailable ? "BALANCE UNAVAILABLE" : "BALANCE LEFT"}
          </span>
          <span className={`text-lg font-bold font-mono tabular-nums ${balanceUnavailable ? "text-gray-400" : isLowBalance ? "text-red-600" : "text-navy"}`}>
            {balanceUnavailable ? "—" : formatINR(balance)}
          </span>
        </div>

        {/* Mobile Download Report Button */}
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-navy hover:bg-navy-dark text-white rounded-md text-xs font-medium cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-gray-300" />
          <span>Audit PDF</span>
        </button>
      </div>
    </div>
  )
}
