import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import LandingPage from "@/pages/LandingPage"
import AdminDashboard from "@/pages/AdminDashboard"
import ClientLedger from "@/pages/ClientLedger"

export default function App() {
  return (
    <BrowserRouter basename="/bjr-expense-tracker">
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
