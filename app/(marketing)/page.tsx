import Link from 'next/link'
import { LockKeyhole, Receipt, ShieldCheck, BookUser } from 'lucide-react'

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
          <Link href="/dashboard" className="text-sm text-[#888] hover:text-white transition-colors">
            Open Dashboard →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#222] bg-[#111]">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            <span className="text-xs text-[#888]">Private Payroll on Solana</span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight tracking-tight">
            Pay your team privately.
            <br />
            <span className="text-[#888]">Prove it to anyone.</span>
          </h1>

          <p className="text-lg text-[#888] leading-relaxed max-w-lg mx-auto">
            Real SOL transfers on Solana. Every payout generates a cryptographic receipt hash
            — share it with an auditor without revealing who got paid or how much.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-[#e5e5e5] text-black rounded-lg font-medium transition-colors"
            >
              Open Dashboard
            </Link>
            <Link
              href="/payroll/new"
              className="inline-flex items-center gap-2 px-6 py-3 border border-[#333] hover:border-[#555] text-white rounded-lg font-medium transition-colors text-sm"
            >
              New Payroll Run →
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#222] px-6 py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <p className="text-xs text-[#555] uppercase tracking-widest text-center">How it works</p>
          <div className="space-y-0">
            {[
              { step: '01', title: 'Create a payroll run', desc: 'Name it by period — "May 2026 W1". Add as many recipients as you need.' },
              { step: '02', title: 'Connect Phantom & send', desc: 'Real SOL transfer hits Solana devnet. You approve in your wallet. Transaction confirmed on-chain.' },
              { step: '03', title: 'Receipt hash is generated', desc: 'SHA-256 fingerprint of paymentId + txSignature + amount + timestamp. Tamper-proof.' },
              { step: '04', title: 'Share proof or keep it private', desc: 'Verifier link proves payment happened. Receipt page requires wallet signature to unlock full details — only sender or recipient can see them.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-6 py-5 border-b border-[#222] last:border-0">
                <span className="text-xs font-mono text-[#555] pt-0.5 shrink-0 w-6">{step}</span>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="text-sm text-[#888] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#222] px-6 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { icon: LockKeyhole, title: 'Private on-chain', desc: 'Sender and recipient are not linked on the public ledger.' },
            { icon: Receipt, title: 'Cryptographic receipt', desc: 'Every payout gets a SHA-256 hash anchored to the real tx.' },
            { icon: ShieldCheck, title: 'Wallet-gated access', desc: 'Only sender or recipient can unlock full details — prove ownership by signing.' },
            { icon: BookUser, title: 'Compliance export', desc: 'Export a full payroll run with attestation hash for auditors.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#111] border border-[#222] flex items-center justify-center">
                <Icon className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-sm text-[#888] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#222] px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xs text-[#555]">Private Settlement Receipts</span>
          <span className="text-xs text-[#555]">Pay anyone. Prove it later.</span>
        </div>
      </footer>
    </main>
  )
}
