import React from "react"
import { Link, useLocation } from "react-router-dom"
import {
  LayoutGrid,
  Download,
  ShieldCheck,
  Rocket,
  X
} from "lucide-react"
import { formatINR, formatTransactionCount } from "@/lib/utils"
import logo from "@/assets/logo.png"

export default function Sidebar({
  totalSpent = 0,
  balance = null,
  transactionCount = 0,
  activeView = "expenses",
  onSelectView,
  investmentCount = 0,
  onDownloadReport,
  clientSlug,
  isOpen = false,
  onClose,
  hideHeaderLogo = false
}) {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith("/admin")

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between overflow-y-auto bg-white border-r border-gray-200 select-none">
      <div>
        {/* Header/Logo Container (if hideHeaderLogo is true, only show close button on mobile if opened) */}
        {!hideHeaderLogo ? (
          <div className="py-6 px-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <Link to="/" onClick={onClose} className="block focus:outline-none">
                <img
                  src={logo}
                  alt="BJR Group"
                  className="w-48 h-auto object-contain block"
                />
              </Link>
              {onClose && (
                <button
                  onClick={onClose}
                  className="lg:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:hidden py-4 px-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-navy">Menu</span>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Navigation Group */}
        <div className="py-5 space-y-6">
          {/* Main Navigation */}
          <div>
            <div className="px-4 mb-2">
              <span className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
                NAVIGATION
              </span>
            </div>

            <div className="space-y-1">
              {!isAdmin && onSelectView ? (
                <>
                  {/* All Expenses (client view switch) */}
                  <button
                    onClick={() => {
                      onSelectView("expenses")
                      if (onClose) onClose()
                    }}
                    className={`w-full flex items-center justify-between py-2 px-4 text-[14px] font-medium transition-colors cursor-pointer ${
                      activeView === "expenses"
                        ? "bg-navy text-white border-l-4 border-[#D4AF37] rounded-r-md mr-2"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-r-md mr-2"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutGrid className={`w-4 h-4 ${activeView === "expenses" ? "text-gray-200" : "text-gray-400"}`} />
                      <span>All Expenses</span>
                    </div>
                    <span
                      className={`text-[12px] font-mono tabular-nums ${
                        activeView === "expenses" ? "text-gray-300" : "text-gray-400"
                      }`}
                    >
                      {transactionCount}
                    </span>
                  </button>

                  {/* Total Investments (client view switch) */}
                  <button
                    onClick={() => {
                      onSelectView("investments")
                      if (onClose) onClose()
                    }}
                    className={`w-full flex items-center justify-between py-2 px-4 text-[14px] font-medium transition-colors cursor-pointer ${
                      activeView === "investments"
                        ? "bg-navy text-white border-l-4 border-[#D4AF37] rounded-r-md mr-2"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-r-md mr-2"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Rocket className={`w-4 h-4 ${activeView === "investments" ? "text-gray-200" : "text-gray-400"}`} />
                      <span>Total Investments</span>
                    </div>
                    <span
                      className={`text-[12px] font-mono tabular-nums ${
                        activeView === "investments" ? "text-gray-300" : "text-gray-400"
                      }`}
                    >
                      {investmentCount}
                    </span>
                  </button>
                </>
              ) : (
                /* All Expenses link (admin sidebar) */
                <Link
                  to={clientSlug ? `/ledger/${clientSlug}` : "/ledger/x7k9m2p4q8v3"}
                  onClick={onClose}
                  className={`flex items-center justify-between py-2 px-4 text-[14px] font-medium transition-colors ${
                    !isAdmin
                      ? "bg-navy text-white border-l-4 border-[#D4AF37] rounded-r-md mr-2"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-r-md mr-2"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutGrid className={`w-4 h-4 ${!isAdmin ? "text-gray-200" : "text-gray-400"}`} />
                    <span>All Expenses</span>
                  </div>
                  <span
                    className={`text-[12px] font-mono tabular-nums ${
                      !isAdmin ? "text-gray-300" : "text-gray-400"
                    }`}
                  >
                    {transactionCount}
                  </span>
                </Link>
              )}

              {/* Admin Portal (Only visible in /admin) */}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={onClose}
                  className="flex items-center justify-between py-2 px-4 text-[14px] font-medium bg-navy text-white border-l-4 border-[#D4AF37] rounded-r-md mr-2"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-gray-200" />
                    <span>Admin Portal</span>
                  </div>
                  <span className="text-[11px] font-medium uppercase text-gray-300 tracking-wider">
                    Admin
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Area: Total Spent Card + Full-Width Download Audit PDF Button BELOW it */}
      <div className="p-4 border-t border-gray-100 bg-white space-y-3">
        {/* Total Spent Card: bg-gray-50, border border-gray-200, rounded-md, p-4 */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
            TOTAL SPENT
          </div>

          <div className="text-xl font-bold text-navy tracking-tight font-mono tabular-nums leading-tight">
            {formatINR(totalSpent)}
          </div>

          <p className="text-xs text-gray-400 mt-1">
            {formatTransactionCount(transactionCount)}
          </p>
        </div>

        {/* Available Balance Card */}
        {balance !== null && (
          <div className={`border rounded-md p-4 ${balance <= 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
              {balance <= 0 ? "⚠ LOW / NO BALANCE" : "AVAILABLE BALANCE"}
            </div>

            <div className={`text-xl font-bold tracking-tight font-mono tabular-nums leading-tight ${balance <= 0 ? "text-red-600" : "text-emerald-700"}`}>
              {formatINR(balance)}
            </div>

            <p className="text-xs text-gray-400 mt-1">
              {balance > 0 ? "Funds − Spent" : "Record funds received"}
            </p>
          </div>
        )}

        {/* Full-width Navy "Download Audit PDF" Button at the VERY BOTTOM */}
        {onDownloadReport && (
          <button
            onClick={() => {
              onDownloadReport()
              if (onClose) onClose()
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-navy hover:bg-navy-dark active:bg-navy text-white rounded-md text-[13px] font-medium transition-colors cursor-pointer shadow-none"
          >
            <Download className="w-4 h-4 text-gray-300" />
            <span>Download Audit PDF</span>
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar — w-64 */}
      <aside className="hidden lg:flex w-64 h-[calc(100vh-9rem)] sticky top-36 shrink-0 flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-in Drawer with Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-navy/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-64 max-w-[85vw] h-full shadow-xl z-10 transition-transform">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
