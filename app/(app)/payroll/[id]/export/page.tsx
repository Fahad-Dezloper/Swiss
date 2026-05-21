'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { Copy, Check, Printer } from 'lucide-react'

interface PaymentLine {
  index: number
  recipient: string
  amountSOL: string
  currency: string
  txSignature: string
  receiptHash: string
  verifierToken: string
  date: string
}

interface ExportData {
  org: string
  period: string
  runId: string
  status: string
  exportedAt: string
  totalRecipients: number
  totalSOL: string
  payments: PaymentLine[]
  attestationHash: string
}

export default function PayrollExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [data, setData] = useState<ExportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/payroll-runs/${id}/export`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [id])

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function copyFullAttestation() {
    if (!data) return
    const lines = [
      `PAYROLL ATTESTATION`,
      `═══════════════════════════════════════`,
      `Organization : ${data.org}`,
      `Period       : ${data.period}`,
      `Run ID       : ${data.runId}`,
      `Status       : ${data.status}`,
      `Exported At  : ${data.exportedAt}`,
      ``,
      `Recipients   : ${data.totalRecipients}`,
      `Total Paid   : ${data.totalSOL} SOL`,
      ``,
      `PAYMENTS`,
      `────────────────────────────────────────`,
      ...data.payments.map((p) =>
        [
          `[${p.index}] ${p.recipient}`,
          `    Amount   : ${p.amountSOL} ${p.currency}`,
          `    Tx       : ${p.txSignature || '—'}`,
          `    Receipt  : ${p.receiptHash || '—'}`,
          `    Verify   : ${p.verifierToken ? `https://psr.app/verify/${p.verifierToken}` : '—'}`,
          `    Date     : ${p.date}`,
        ].join('\n')
      ),
      ``,
      `ATTESTATION HASH`,
      `────────────────────────────────────────`,
      data.attestationHash,
    ]
    copyText(lines.join('\n'), 'full')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#888]">Loading…</div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-24 space-y-3">
        <p className="text-sm text-[#888]">Export not available.</p>
        <Link href={`/payroll/${id}`} className="text-xs text-white underline">← Back</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link href={`/payroll/${id}`} className="text-[#888] hover:text-white text-sm">← Back</Link>
            <span className="text-[#444]">/</span>
            <h1 className="text-xl font-semibold text-white">Compliance Export</h1>
          </div>
          <p className="text-xs text-[#888]">{data.org} · {data.period}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#222] text-xs text-[#888] hover:text-white hover:border-[#444] transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
          <button
            onClick={copyFullAttestation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#43AED6] text-white text-xs font-medium hover:bg-[#3a9dc3] transition-colors"
          >
            {copied === 'full' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === 'full' ? 'Copied' : 'Copy Attestation'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Organization', value: data.org },
          { label: 'Period', value: data.period },
          { label: 'Recipients', value: String(data.totalRecipients) },
          { label: 'Total Paid', value: `${data.totalSOL} SOL` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-[#222] bg-[#111] px-4 py-3">
            <p className="text-xs text-[#888]">{label}</p>
            <p className="text-sm text-white font-mono mt-0.5 truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Payments */}
      <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
        <div className="px-6 py-3 border-b border-[#222] flex items-center justify-between">
          <span className="text-xs text-[#888] uppercase tracking-wider font-medium">
            Payments ({data.payments.length})
          </span>
          <span className="text-xs text-[#555]">
            Exported {new Date(data.exportedAt).toLocaleString()}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#222]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Recipient</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Receipt Hash</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Verify</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {data.payments.map((p) => (
              <tr key={p.index} className="hover:bg-black transition-colors">
                <td className="px-4 py-3 text-[#555] text-xs">{p.index}</td>
                <td className="px-4 py-3 text-white text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate max-w-[120px]" title={p.recipient}>{p.recipient.slice(0, 8)}…{p.recipient.slice(-4)}</span>
                    <button
                      onClick={() => copyText(p.recipient, `addr-${p.index}`)}
                      className="text-[#555] hover:text-white shrink-0"
                    >
                      {copied === `addr-${p.index}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-white text-xs font-mono">{p.amountSOL} {p.currency}</td>
                <td className="px-4 py-3 text-[#555] text-xs font-mono">
                  {p.receiptHash ? (
                    <div className="flex items-center gap-1.5">
                      <span title={p.receiptHash}>{p.receiptHash.slice(0, 12)}…</span>
                      <button onClick={() => copyText(p.receiptHash, `hash-${p.index}`)} className="text-[#555] hover:text-white">
                        {copied === `hash-${p.index}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  {p.verifierToken ? (
                    <a
                      href={`/verify/${p.verifierToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#888] hover:text-white underline font-mono"
                    >
                      verify →
                    </a>
                  ) : <span className="text-xs text-[#555]">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Attestation hash */}
      <div className="rounded-xl border border-[#222] bg-[#111] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-[#888] uppercase tracking-wider">Attestation Hash</p>
          <button
            onClick={() => copyText(data.attestationHash, 'attest')}
            className="flex items-center gap-1 text-xs text-[#555] hover:text-white transition-colors"
          >
            {copied === 'attest' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            copy
          </button>
        </div>
        <p className="text-sm text-white font-mono break-all">{data.attestationHash}</p>
        <p className="text-xs text-[#555] leading-relaxed">
          SHA-256 of this entire export. Share this hash with an auditor — they can
          independently verify the document has not been modified after export.
        </p>
      </div>
    </div>
  )
}
