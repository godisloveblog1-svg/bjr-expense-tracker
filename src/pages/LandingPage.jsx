import React from "react"
import { Link } from "react-router-dom"
import {
  ShieldCheck,
  Receipt,
  FileSpreadsheet,
  Link2,
  Lock,
  ArrowRight,
  CheckCircle2,
  Eye,
  Layers,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  const steps = [
    {
      num: "01",
      title: "I Spend",
      desc: "Every cloud hosting bill, domain renewal, hardware or design asset purchase is initiated on your project's behalf.",
      icon: Receipt,
    },
    {
      num: "02",
      title: "I Record",
      desc: "The transaction amount, invoice date, category, and direct receipt proof are logged into the certified Supabase ledger.",
      icon: FileSpreadsheet,
    },
    {
      num: "03",
      title: "I Share URL",
      desc: "A secure, private client ledger link is shared directly with you for constant real-time visibility. No account needed.",
      icon: Link2,
    },
    {
      num: "04",
      title: "Client Clicks",
      desc: "You can view the running rupee balance, inspect individual bill images/PDFs in full resolution, and export audit sheets.",
      icon: Eye,
    },
    {
      num: "05",
      title: "100% Transparency",
      desc: "Zero hidden markups. Complete peace of mind and frictionless accounting verification for both parties.",
      icon: ShieldCheck,
    }
  ]

  return (
    <div className="min-h-screen bg-light-gray text-navy flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-gray-border bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <img
                src="/logo.png"
                alt="BJR Group"
                className="h-10 w-auto object-contain"
              />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="text-xs text-navy hover:bg-light-gray font-semibold">
                <Lock className="w-3.5 h-3.5 mr-1 text-gold" />
                Admin Portal
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center">
          {/* Central Logo Display */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white rounded-2xl border border-gray-border shadow-xs">
              <img
                src="/logo.png"
                alt="BJR Group Logo"
                className="h-16 w-auto object-contain"
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-white text-navy border border-gold mb-6 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <span>Zero Guesswork Financial Accountability</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-navy max-w-3xl mx-auto leading-[1.15]">
            Every Rupee Spent On Your Project,{" "}
            <span className="text-gold">
              100% Accountable
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-gray-text max-w-2xl mx-auto leading-relaxed">
            Eliminate invoice ambiguity. We log every single expense with its exact vendor receipt,
            live rupee tally, timestamp, and audit-ready PDF export.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/ledger/x7k9m2p4q8v3" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-sm font-bold bg-navy hover:bg-navy-dark text-white shadow-xs">
                View Client Dashboard
                <ArrowRight className="w-4 h-4 ml-2 text-gold" />
              </Button>
            </Link>
            <Link to="/admin" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto h-12 px-8 text-sm font-bold border-gold text-navy hover:bg-white">
                Log In As Admin
              </Button>
            </Link>
          </div>

          {/* Value Props Strip */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="bg-white p-4 rounded-xl border border-gray-border shadow-2xs text-left">
              <div className="text-navy font-black text-xl">100%</div>
              <div className="text-xs text-gray-text font-semibold">Receipt Coverage</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-border shadow-2xs text-left">
              <div className="text-gold-dark font-black text-xl">Live Sync</div>
              <div className="text-xs text-gray-text font-semibold">Real-time DB Ledger</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-border shadow-2xs text-left">
              <div className="text-navy font-black text-xl">Instant PDF</div>
              <div className="text-xs text-gray-text font-semibold">One-Click Tax Audit</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-border shadow-2xs text-left">
              <div className="text-gold-dark font-black text-xl">Zero Markup</div>
              <div className="text-xs text-gray-text font-semibold">Actual Cost Incurred</div>
            </div>
          </div>
        </div>

        {/* 5-Step Process Section with Navy arrows & Gold icons */}
        <section className="bg-white border-y border-gray-border py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-navy">
                The Transparency Workflow
              </h2>
              <p className="text-sm text-gray-text mt-2 font-medium">
                A simple 5-step operational pipeline built on radical openness and trust.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {steps.map((step, idx) => {
                const IconComponent = step.icon
                return (
                  <div
                    key={step.num}
                    className="relative bg-light-gray hover:bg-white transition-all rounded-2xl p-5 border border-gray-border flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-black tracking-widest text-navy/40">
                          {step.num}
                        </span>
                        {/* Gold Icon */}
                        <div className="w-9 h-9 rounded-lg bg-navy flex items-center justify-center text-gold shadow-2xs">
                          <IconComponent className="w-5 h-5 text-gold" />
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-navy mb-2">
                        {step.title}
                      </h3>
                      <p className="text-xs text-gray-text leading-relaxed font-medium">
                        {step.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-border flex items-center justify-between text-[11px] font-bold text-navy">
                      <span className="flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-gold" />
                        Verified
                      </span>
                      {idx < steps.length - 1 && (
                        <ArrowRight className="hidden md:inline w-3.5 h-3.5 text-navy group-hover:translate-x-0.5 transition-transform" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Call to action section */}
        <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-navy text-white rounded-3xl p-8 sm:p-12 shadow-sm border border-navy relative overflow-hidden">
            <div className="max-w-2xl mx-auto relative z-10">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3">
                Experience the live client dashboard now
              </h2>
              <p className="text-sm text-light-gray/80 mb-8 font-medium">
                Inspect how your team and clients can filter expenditures by category, review high-res bills,
                and download verified audit reports.
              </p>
              <Link to="/ledger/x7k9m2p4q8v3">
                <Button size="lg" className="bg-gold text-navy hover:bg-white font-bold h-12 px-8 shadow-xs">
                  Open Client Ledger
                  <ArrowRight className="w-4 h-4 ml-2 text-navy" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-text">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="BJR Group" className="h-6 w-auto object-contain" />
            <span>© {new Date().getFullYear()} BJR Group. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 font-semibold text-navy">
            <Link to="/ledger/x7k9m2p4q8v3" className="hover:text-gold transition-colors">
              Client Portal
            </Link>
            <Link to="/admin" className="hover:text-gold transition-colors">
              Admin Console
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
