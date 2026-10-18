import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import LandingPage from "@/pages/LandingPage"
import AdminDashboard from "@/pages/AdminDashboard"
import ClientLedger from "@/pages/ClientLedger"

// Vite sets BASE_URL from `base` in vite.config.js: "/" on Vercel and
// "/<repo>/" on GitHub Pages. The router must use the same prefix, otherwise
// every route falls through to the catch-all on Pages. Trailing slash removed
// because react-router expects a bare prefix ("" is treated as the root).
const ROUTER_BASENAME = import.meta.env.BASE_URL.replace(/\/+$/, "")

export default function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/ledger/:clientSlug" element={<ClientLedger />} />
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
