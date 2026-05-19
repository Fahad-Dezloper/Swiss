import Link from 'next/link'
import { LockKeyhole, FileText, Eye } from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black flex flex-col">
      {/* Nav */}
      <nav className="border-b border-[#222] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-white flex items-center justify-center">
              <LockKeyhole className="h-3.5 w-3.5 text-black" />
            </div>
            <span className="text-white font-semibold tracking-tight">PSR</span>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-[#888] hover:text-white transition-colors"
          >
            Open Dashboard →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#222] bg-[#111] mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            <span className="text-xs text-[#888]">Private Settlement Receipts</span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight tracking-tight mb-6">
            Send money privately.
            <br />
            <span className="text-[#888]">Prove it later.</span>
          </h1>

          <p className="text-lg text-[#888] mb-10 leading-relaxed max-w-lg mx-auto">
            Settle invoices on-chain without exposing your counterparty, amount, or timing —
            then share cryptographic proof with exactly who needs it, when they need it.
          </p>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-[#e5e5e5] text-black rounded-lg font-medium transition-colors duration-150"
          >
            Open Dashboard
          </Link>
        </div>
      </section>

      {/* Value props */}
      <section className="border-t border-[#222] px-6 py-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-4">
            <div className="h-10 w-10 rounded-lg bg-[#111] border border-[#222] flex items-center justify-center">
              <LockKeyhole className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-white font-semibold">Private Transfer</h3>
            <p className="text-sm text-[#888] leading-relaxed">
              Payments are routed through stealth addresses. No observer can link sender to
              recipient from the chain alone.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="h-10 w-10 rounded-lg bg-[#111] border border-[#222] flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-white font-semibold">Cryptographic Receipt</h3>
            <p className="text-sm text-[#888] leading-relaxed">
              Every settlement generates a tamper-proof receipt hash anchored to the transaction.
              You hold the receipt; we hold nothing.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="h-10 w-10 rounded-lg bg-[#111] border border-[#222] flex items-center justify-center">
              <Eye className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-white font-semibold">Selective Disclosure</h3>
            <p className="text-sm text-[#888] leading-relaxed">
              Generate a verifier link revealing only the fields you choose — invoice ref,
              amount, status — and nothing more.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#222] px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xs text-[#555]">Private Settlement Receipts</span>
          <span className="text-xs text-[#555]">Finance-grade privacy, on-chain.</span>
        </div>
      </footer>
    </main>
  )
}
