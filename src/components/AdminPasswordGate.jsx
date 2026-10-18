import React, { useState } from "react"
import { Lock, ArrowRight, AlertCircle, KeyRound, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase, isSupabaseConfigured } from "@/supabaseClient"
import logo from "@/assets/logo.png"

export default function AdminPasswordGate({ onAuthenticated }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleUnlock = async (e) => {
    e.preventDefault()
    setError("")

    if (!(isSupabaseConfigured && supabase)) {
      setError("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.")
      return
    }

    setLoading(true)
    try {
      // Real authentication — the session token is what authorizes all writes.
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Invalid email or password. Please try again."
            : authError.message
        )
        return
      }

      if (!data?.session) {
        setError("Sign-in succeeded but no session was returned. Please try again.")
        return
      }

      onAuthenticated()
    } catch (err) {
      setError(err.message || "Sign-in failed. Please try again.")
    } finally {
      setLoading(false)
    }
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
                src={logo}
                alt="BJR Group Logo"
                className="h-14 w-auto object-contain"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-navy/5 text-navy text-xs font-semibold uppercase tracking-wider mb-2">
              <KeyRound className="w-3.5 h-3.5" />
              Restricted Area
            </div>
            <h1 className="text-xl font-bold tracking-tight text-navy">
              Admin Sign In
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Sign in to manage expenses, funds and investments
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError("")
                  }}
                  placeholder="you@example.com"
                  className="w-full h-10 pl-9 pr-3.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors"
                />
              </div>
            </div>

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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError("")
                  }}
                  placeholder="Enter your password..."
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
              disabled={loading || !email || !password}
              className="w-full h-10 bg-navy hover:bg-navy/90 text-white font-medium text-sm rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              {loading ? (
                <span>Checking...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </>
              )}
            </Button>
          </form>

          {/* Security footnote */}
          <div className="pt-2 border-t border-gray-100 text-center">
            <span className="text-[11px] text-gray-400">
              Secured by Supabase Auth • Writes require a signed-in admin
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
