import React, { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import Sidebar from "@/components/Sidebar"
import ExpenseTable from "@/components/ExpenseTable"
import { supabase, isSupabaseConfigured } from "@/supabaseClient"
import { fetchCategories } from "@/lib/categoriesService"
import { exportExpensesToPDF } from "@/lib/pdfExport"
import { formatINR, formatTransactionCount } from "@/lib/utils"
import { AlertCircle, Download, Search, TrendingUp } from "lucide-react"
import { Select } from "@/components/ui/input"

const VALID_CLIENT_SLUG = "x7k9m2p4q8v3"

export default function ClientLedger() {
  const { clientSlug } = useParams()
  const [expenses, setExpenses] = useState([])
  const [categoriesList, setCategoriesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

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

  useEffect(() => {
    async function fetchExpenses() {
      setLoading(true)

      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error: supaError } = await supabase
            .from("expenses")
            .select("*")
            .order("id", { ascending: false })

          if (supaError) {
            console.warn("Supabase query error:", supaError)
            setExpenses([])
          } else {
            setExpenses(data || [])
          }
        } catch (err) {
          console.error("Failed to connect to Supabase:", err)
          setExpenses([])
        }
      } else {
        setExpenses([])
      }

      setLoading(false)
    }

    fetchExpenses()
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

  const handleDownloadPDF = () => {
    exportExpensesToPDF(filteredExpenses, clientSlug || "BJR-Client")
  }

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
            src="/logo.png"
            alt="BJR Group"
            className="h-24 md:h-32 w-auto object-contain block"
          />
        </Link>
      </header>

      {/* TWO-COLUMN LAYOUT ON DESKTOP */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0 w-full">
        <Sidebar
          totalSpent={totalSpent}
          transactionCount={totalTransactions}
          activeFilter={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onDownloadReport={handleDownloadPDF}
          categories={categoryNames}
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
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs uppercase tracking-wider font-semibold text-gray-600">
                Live &amp; Verified
              </span>
            </div>
          </div>

          {/* THE "TOTAL SPEND" BOX */}
          <div className="relative overflow-hidden rounded-md border border-[#D4AF37]/60 border-l-4 border-l-[#D4AF37] bg-gradient-to-br from-[#0B2149] via-[#0E2856] to-[#123168] p-4.5 sm:p-6 lg:p-7 text-white shadow-md">
            {/* Ambient decorative glow / pattern */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

            {/* Top row */}
            <div className="flex items-center justify-between mb-2.5 sm:mb-4">
              <span className="text-[11px] font-semibold tracking-wider text-[#D4AF37] uppercase">
                TOTAL SPENT
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-gray-300">
                  Live Sync
                </span>
              </div>
            </div>

            {/* Center Massive Amount */}
            <div className="my-1 sm:my-2">
              <span className="text-3xl sm:text-5xl lg:text-6xl font-bold font-mono tracking-tight tabular-nums text-white block">
                {formatINR(totalSpent)}
              </span>
            </div>

            {/* Bottom Row */}
            <div className="flex items-center justify-between border-t border-white/10 pt-3 sm:pt-4 mt-3 sm:mt-4">
              <span className="text-xs text-gray-300 font-normal">
                {formatTransactionCount(totalTransactions)}
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
                  Itemized Expenses
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Verified invoices with original receipt attachments
                </p>
              </div>

              {/* Clean search bar & categories dropdown toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Search input */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy"
                  />
                </div>

                {/* Category select from categories table */}
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
              </div>
            </div>

            {/* Table Container: Dense, bordered */}
            {loading ? (
              <div className="rounded-md border border-gray-200 bg-white p-12 text-center text-gray-500 text-xs">
                Loading verified transactions...
              </div>
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

      {/* MOBILE STICKY BOTTOM FOOTER (< lg breakpoint): Shows Total Spent & amount */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
            TOTAL SPENT
          </span>
          <span className="text-lg font-bold font-mono tabular-nums text-navy">
            {formatINR(totalSpent)}
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
