import React, { useState } from "react"
import { Lock, ArrowRight, AlertCircle, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdminPasswordGate({ onAuthenticated }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleUnlock = (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD || ""

    // Small delay to provide natural button feedback
    setTimeout(() => {
      if (!expectedPassword) {
        setError("VITE_ADMIN_PASSWORD is not configured in .env")
        setLoading(false)
        return
      }

      if (password === expectedPassword) {
        sessionStorage.setItem("admin_authed", "true")
        onAuthenticated()
      } else {
        setError("Invalid password. Please try again.")
        setLoading(false)
      }
    }, 200)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* BJR Logo at Top */}
          <div className="flex flex-col items-center text-center">
            <div className="h-16 flex items-center justify-center mb-3">
              <img
                src="/logo.png"
                alt="BJR Group Logo"
                className="h-14 w-auto object-contain"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-navy/5 text-navy text-xs font-semibold uppercase tracking-wider mb-2">
              <KeyRound className="w-3.5 h-3.5" />
              Restricted Area
            </div>
            <h1 className="text-xl font-bold tracking-tight text-navy">
              Admin Access
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Enter the master passphrase to manage expenses & categories
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type="password"
                  autoFocus
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError("")
                  }}
                  placeholder="Enter admin password..."
                  className="w-full h-10 px-3.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 font-medium animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !password}
              className="w-full h-10 bg-navy hover:bg-navy/90 text-white font-medium text-sm rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              {loading ? (
                <span>Checking...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Unlock</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </>
              )}
            </Button>
          </form>

          {/* Security footnote */}
          <div className="pt-2 border-t border-gray-100 text-center">
            <span className="text-[11px] text-gray-400">
              Session-only authentication • Non-persistent
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
