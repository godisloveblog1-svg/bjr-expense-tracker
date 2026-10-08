import React from "react"
import { Search, Menu, Lock } from "lucide-react"
import { Select } from "@/components/ui/input"

export default function Header({
  searchTerm = "",
  onSearchChange,
  selectedCategory = "all",
  onCategoryChange,
  categories = [],
  onToggleSidebar,
  onLogout
}) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 sm:px-6 py-3.5">
      {/* DESKTOP HEADER (lg and up) */}
      <div className="hidden lg:flex items-center justify-between gap-4">
        {/* Left: Title & Subtitle */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-navy leading-snug">
            Client Expense Tracker
          </h1>
          <p className="text-sm text-gray-500 font-normal leading-normal">
            Every Rupee Accountable
          </p>
        </div>

        {/* Right: Search Bar, Category Filter & Live Status */}
        <div className="flex items-center gap-3">
          {/* Search bar with ⌘K indicator */}
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-9 pl-9 pr-12 text-[13px] rounded-md border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy"
            />
            <span className="absolute right-2.5 top-2 px-1.5 py-0.5 text-[10px] font-mono text-gray-400 border border-gray-200 rounded bg-gray-50 select-none">
              ⌘K
            </span>
          </div>

          {/* Category Dropdown */}
          <div className="w-44">
            <Select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="h-9 text-[13px] rounded-md border-gray-200 bg-white text-gray-700 font-medium focus:border-navy focus:ring-1 focus:ring-navy"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>

          {/* Live Status indicator on the right */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200 whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
              <span className="text-xs text-gray-600 font-medium">Live</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <span className="text-xs text-gray-400 font-normal">
              Last updated 08 Oct 2026, 4:30 PM
            </span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-md transition-colors shrink-0 ml-1"
              title="Lock Admin Dashboard"
            >
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span>Lock</span>
            </button>
          )}
        </div>
      </div>

      {/* MOBILE HEADER (< lg breakpoint): Clean single row */}
      <div className="lg:hidden flex flex-col gap-3">
        {/* Single Top Row: Hamburger on left + Title next to it + Optional Lock on right */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-md text-navy hover:bg-gray-100 border border-gray-200 shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-navy truncate">
              Client Expense Tracker
            </h1>
            <p className="text-xs text-gray-500 truncate">
              Every Rupee Accountable
            </p>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-md shrink-0"
              title="Lock Admin Dashboard"
            >
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span>Lock</span>
            </button>
          )}
        </div>

        {/* Search bar and Category filter: Stacked vertically with gap-3, full width */}
        <div className="flex flex-col gap-3 w-full">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-[13px] rounded-md border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy"
            />
          </div>

          <div className="w-full">
            <Select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full h-9 text-[13px] rounded-md border-gray-200 bg-white text-gray-700 font-medium focus:border-navy focus:ring-1 focus:ring-navy"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>
    </header>
  )
}
