import Link from "next/link";
import Image from "next/image";
import {
  LockKeyhole,
  ShieldCheck,
  Receipt,
  BookUser,
  ArrowRight,
  Zap,
  Eye,
  CheckCircle2,
} from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#ffffff] text-[#111111] flex flex-col overflow-hidden">
      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-[#e8e8e8] bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-[#111111] flex items-center justify-center">
              <LockKeyhole className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-[#111111]">
              Swiss
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#888888]">
            <a href="#how" className="hover:text-[#111111] transition-colors">
              How it works
            </a>
            <a
              href="#features"
              className="hover:text-[#111111] transition-colors"
            >
              Features
            </a>
            <a
              href="#payroll"
              className="hover:text-[#111111] transition-colors"
            >
              Payroll
            </a>
          </div>
          <Link
            href="/pay"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#111111] hover:bg-[#333333] text-white text-sm font-semibold transition-colors"
          >
            Launch App <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-40 pb-28 px-6 flex flex-col items-center text-center">
        {/* Subtle background texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#f5f5f5_0%,_#ffffff_60%)] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#e0e0e0] bg-[#f5f5f5] text-[#555555] text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-[#111111] animate-pulse" />
            Private Payroll · Solana · Stealth Payments
          </div>

          {/* Headline */}
          <h1 className="text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight text-[#111111]">
            Pay your team.
            <br />
            <span className="text-[#43AED6]">Leave no trace.</span>
          </h1>

          <p className="text-xl text-[#666666] leading-relaxed max-w-xl mx-auto">
            Swiss routes payroll through Umbra's stealth pool on Solana —
            amounts and recipients stay private on-chain, yet every payment
            generates a cryptographic receipt you can prove to anyone.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/pay"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#43AED6] hover:bg-[#333333] text-black font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              Send a private payment <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Powered by Umbra badge */}
          <div className="flex items-center justify-center pt-2">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "6px 14px",
                borderRadius: "99px",
                background: "#f5f5f5",
                border: "1px solid #e8e8e8",
              }}
            >
              <span className="text-lg text-neutral-700">Powered by</span>
              <div className="w-8 h-8 rounded-xl overflow-hidden ">
                <img
                  src="/logo/umbra.png"
                  alt="Umbra"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Receipt preview card */}
        <div className="relative z-10 mt-20 w-full max-w-sm mx-auto">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#ffffff",
              border: "1px solid #e8e8e8",
              boxShadow:
                "0 2px 4px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08)",
            }}
          >
            {/* Card header */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  height: "32px",
                  width: "32px",
                  borderRadius: "8px",
                  background: "#e8f7fc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ShieldCheck
                  style={{ height: "15px", width: "15px", color: "#43AED6" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#111111",
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  Swiss Receipt
                </p>
                <p
                  style={{
                    fontSize: "10px",
                    color: "#aaaaaa",
                    fontFamily: "monospace",
                    margin: "2px 0 0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  May 2026 W2 · Payroll
                </p>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "99px",
                  background: "#f0fdf4",
                  color: "#16a34a",
                  border: "1px solid #bbf7d0",
                  whiteSpace: "nowrap",
                }}
              >
                ✓ Confirmed
              </span>
            </div>

            {/* Amount strip */}
            <div
              style={{
                padding: "14px 20px",
                background: "#f8fdff",
                borderBottom: "1px solid #e8f4fb",
              }}
            >
              <p
                style={{
                  fontSize: "10px",
                  color: "#aaaaaa",
                  margin: "0 0 3px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 500,
                }}
              >
                Amount
              </p>
              <p
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#111111",
                  fontFamily: "monospace",
                  margin: 0,
                  letterSpacing: "-0.3px",
                }}
              >
                4,250.00{" "}
                <span
                  style={{
                    fontSize: "12px",
                    color: "#888888",
                    fontWeight: 500,
                  }}
                >
                  USDC
                </span>
              </p>
            </div>

            {/* Card body */}
            <div
              style={{
                padding: "14px 20px",
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "11px", color: "#aaaaaa" }}>
                  Recipient
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontFamily: "monospace",
                    color: "#555555",
                    background: "#f5f5f5",
                    padding: "2px 8px",
                    borderRadius: "6px",
                  }}
                >
                  8xMF…jA1c
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "11px", color: "#aaaaaa" }}>Rail</span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#43AED6",
                    fontWeight: 600,
                  }}
                >
                  ● Umbra stealth
                </span>
              </div>
              <div
                style={{
                  marginTop: "2px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                }}
              >
                <p
                  style={{
                    fontSize: "9px",
                    color: "#cccccc",
                    margin: "0 0 4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontWeight: 600,
                  }}
                >
                  Receipt Hash
                </p>
                <p
                  style={{
                    fontSize: "10px",
                    fontFamily: "monospace",
                    color: "#cccccc",
                    margin: 0,
                    wordBreak: "break-all",
                    lineHeight: 1.5,
                  }}
                >
                  a3f8c2d1e94b0712f56a…b8e3
                </p>
              </div>
            </div>

            {/* Card footer */}
            <div
              style={{
                padding: "10px 20px",
                borderTop: "1px solid #f0f0f0",
                background: "#fafafa",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <LockKeyhole
                style={{
                  height: "11px",
                  width: "11px",
                  color: "#43AED6",
                  flexShrink: 0,
                }}
              />
              <p style={{ fontSize: "10px", color: "#aaaaaa", margin: 0 }}>
                Sign with wallet to unlock full details
              </p>
            </div>
          </div>
          {/* Glow under card */}
          <div
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-2/3 h-6 rounded-full blur-xl"
            style={{ background: "rgba(67,174,214,0.12)" }}
          />
        </div>
      </section>

      {/* ── Stat bar ── */}
      <section className="border-y border-[#eeeeee] bg-[#fafafa] py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { value: "0 leaks", label: "On-chain sender/recipient linkage" },
            { value: "SHA-256", label: "Receipt hash per payment" },
            { value: "Solana", label: "Sub-second finality" },
          ].map(({ value, label }) => (
            <div key={label} className="space-y-1">
              <p className="text-2xl font-bold text-[#111111]">{value}</p>
              <p className="text-xs text-[#aaaaaa]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="px-6 py-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-3 mb-16">
            <p className="text-xs text-[#43AED6] uppercase tracking-widest font-semibold">
              How it works
            </p>
            <h2 className="text-4xl font-bold text-[#111111]">
              Private by default. Provable on demand.
            </h2>
            <p className="text-[#888888] max-w-lg mx-auto">
              Four steps from sending payroll to handing an auditor
              cryptographic proof — without revealing who got paid.
            </p>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-[#e0e0e0] via-[#eeeeee] to-transparent hidden md:block" />

            <div className="space-y-0">
              {[
                {
                  icon: Zap,
                  step: "01",
                  title: "Create a payroll run",
                  desc: "Name it by period — 'May 2026 W2'. Add recipients, set amounts in USDC. Everything stays in your control until you hit send.",
                },
                {
                  icon: ShieldCheck,
                  step: "02",
                  title: "Payments route through Umbra",
                  desc: "Each transfer flows through Umbra's stealth pool. On-chain, there's no readable link between you and your recipients. Approve the signature in your wallet — that's it.",
                },
                {
                  icon: Receipt,
                  step: "03",
                  title: "Cryptographic receipt is generated",
                  desc: "A SHA-256 fingerprint of the payment ID, tx signature, amount, and timestamp is stored on Swiss. Tamper-proof. Immutable.",
                },
                {
                  icon: Eye,
                  step: "04",
                  title: "Prove it — to exactly who needs to know",
                  desc: "Share a receipt link. The verifier proves wallet ownership by signing a message. Only sender or recipient unlocks full details. Auditors get what they need. Everyone else sees nothing.",
                },
              ].map(({ icon: Icon, step, title, desc }) => (
                <div
                  key={step}
                  className="flex gap-8 py-8 border-b border-[#f0f0f0] last:border-0"
                >
                  <div className="relative flex flex-col items-center shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-[#f5f5f5] border border-[#e8e8e8] flex items-center justify-center z-10">
                      <Icon
                        className="h-4.5 w-4.5 text-[#555555]"
                        style={{ width: "18px", height: "18px" }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 pt-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#cccccc]">
                        {step}
                      </span>
                      <h3 className="text-base font-semibold text-[#111111]">
                        {title}
                      </h3>
                    </div>
                    <p className="text-sm text-[#888888] leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section
        id="features"
        className="px-6 py-24 border-t border-[#eeeeee] bg-[#fafafa]"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-3 mb-16">
            <p className="text-xs text-[#43AED6] uppercase tracking-widest font-semibold">
              Features
            </p>
            <h2 className="text-4xl font-bold text-[#111111]">
              Everything payroll needs. Nothing it shouldn't expose.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: ShieldCheck,
                title: "Stealth payments",
                desc: "Routed through Umbra's zero-knowledge pool. Sender and recipient are unlinkable on Solana's public ledger.",
                highlight: true,
              },
              {
                icon: Receipt,
                title: "Cryptographic receipts",
                desc: "Every payment gets a SHA-256 hash anchored to the on-chain signature. Share the hash — not the details.",
              },
              {
                icon: Eye,
                title: "Wallet-gated access",
                desc: "Only the sender or recipient can unlock full transaction details by signing a message — proving ownership without sharing keys.",
              },
              {
                icon: BookUser,
                title: "Compliance export",
                desc: "Export a full payroll run with attestation hash. Give auditors exactly what they need in a tamper-evident format.",
              },
              {
                icon: LockKeyhole,
                title: "Claim stealth UTXOs",
                desc: "Recipients scan for payments locked to their stealth address and claim them to their public USDC balance — privately.",
              },
              {
                icon: Zap,
                title: "Instant on Solana",
                desc: "Sub-second transaction finality. No bridges, no L2 delays. Real on-chain payments with full receipt in seconds.",
              },
            ].map(({ icon: Icon, title, desc, highlight }) => (
              <div
                key={title}
                style={{
                  position: "relative",
                  borderRadius: "16px",
                  padding: "24px",
                  border: highlight
                    ? "1px solid rgba(67,174,214,0.3)"
                    : "1px solid #e8e8e8",
                  background: highlight ? "#f0f9ff" : "#ffffff",
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                <div
                  style={{
                    height: "36px",
                    width: "36px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                    background: highlight ? "rgba(67,174,214,0.12)" : "#f5f5f5",
                  }}
                >
                  <Icon
                    style={{
                      height: "16px",
                      width: "16px",
                      color: highlight ? "#43AED6" : "#888888",
                    }}
                  />
                </div>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#111111",
                    margin: "0 0 8px",
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#888888",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Payroll section ── */}
      <section id="payroll" className="px-6 py-24 border-t border-[#eeeeee]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <p className="text-xs text-[#43AED6] uppercase tracking-widest font-semibold">
              Payroll runs
            </p>
            <h2 className="text-4xl font-bold leading-tight text-[#111111]">
              Batch private payments in one run
            </h2>
            <p className="text-[#888888] leading-relaxed">
              Group your team's payments by period. Every recipient gets their
              own stealth transfer — no one can tell who else was on the run.
              Export the whole thing for compliance.
            </p>
            <ul className="space-y-3">
              {[
                "Name runs by period — May W1, June, Q2",
                "Unlimited recipients per run",
                "Each payment gets its own receipt hash",
                "Full export with attestation for auditors",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm text-[#666666]"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#43AED6] shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/payroll/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#111111] hover:bg-[#333333] !text-white font-semibold transition-all shadow-sm"
            >
              Start a payroll run <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Payroll run preview */}
          <div className="rounded-2xl border border-[#e8e8e8] bg-white overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <div className="px-5 py-3.5 border-b border-[#f0f0f0] flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#111111]">
                  May 2026 · W2
                </p>
                <p className="text-[10px] text-[#aaaaaa] mt-0.5">
                  3 recipients · USDC via Umbra
                </p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f0f9ff] text-[#43AED6] border border-[#43AED6]/20">
                Complete
              </span>
            </div>
            <div className="divide-y divide-[#f5f5f5]">
              {[
                { addr: "8xMF…jA1c", amount: "4,250.00", status: "sent" },
                { addr: "Gh9P…mNk2", amount: "3,100.00", status: "sent" },
                { addr: "vQrZ…8Yp1", amount: "2,800.00", status: "sent" },
              ].map(({ addr, amount }) => (
                <div
                  key={addr}
                  className="flex items-center justify-between px-5 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-[#f5f5f5] flex items-center justify-center">
                      <span className="text-[8px] font-mono text-[#aaaaaa]">
                        {addr.slice(0, 2)}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-[#888888]">
                      {addr}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold text-[#111111]">
                      {amount} USDC
                    </span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3.5 border-t border-[#f0f0f0] bg-[#fafafa] flex items-center justify-between">
              <span className="text-[10px] text-[#aaaaaa]">
                Total disbursed
              </span>
              <span className="text-sm font-bold font-mono text-[#111111]">
                10,150.00 USDC
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-24 border-t border-[#eeeeee] bg-[#fafafa]">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold leading-tight text-[#111111]">
              Pay anyone.
              <br />
              <span className="text-[#43AED6]">Prove it later.</span>
            </h2>
            <p className="text-[#888888] text-lg">
              Connect your Solana wallet and send your first private payment in
              under a minute.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/pay"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#111111] hover:bg-[#333333] !text-white font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              Open Swiss <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <p className="text-xs text-[#cccccc]">
            No account required · Connect any Solana wallet
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#eeeeee] px-6 py-8 bg-white">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-lg bg-[#111111] flex items-center justify-center">
              <LockKeyhole className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-[#111111]">Swiss</span>
            <span className="text-xs text-[#cccccc] ml-1">
              Private Settlement Receipts
            </span>
          </div>
          <div className="flex items-center gap-2" style={{ opacity: 0.5 }}>
            <span className="text-xs text-[#aaaaaa]">
              Built on Solana · Powered by
            </span>
            <Image
              src="/logo/umbra.png"
              alt="Umbra"
              width={48}
              height={14}
              style={{ objectFit: "contain" }}
            />
          </div>
        </div>
      </footer>
    </main>
  );
}
