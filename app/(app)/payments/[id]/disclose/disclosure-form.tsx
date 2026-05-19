'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LockKeyhole, Copy, Check, Eye } from 'lucide-react'

const DISCLOSURE_FIELDS = [
  { key: 'invoice_ref',        label: 'Invoice Reference',    description: 'e.g. INV-2024-0041' },
  { key: 'timestamp',          label: 'Settlement Timestamp', description: 'Date and time of settlement' },
  { key: 'settlement_status',  label: 'Settlement Status',    description: 'Delivered / Claimed / etc.' },
  { key: 'amount',             label: 'Amount',               description: 'Exact payment amount' },
  { key: 'currency',           label: 'Currency',             description: 'Token used (e.g. USDC)' },
] as const

type FieldKey = typeof DISCLOSURE_FIELDS[number]['key']

interface Payment {
  id: string
  invoiceRef: string
  amount: number
  currency: string
}

export default function DisclosureForm({ payment }: { payment: Payment }) {
  const [selected, setSelected] = useState<Set<FieldKey>>(new Set(['invoice_ref', 'settlement_status']))
  const [loading, setLoading] = useState(false)
  const [verifierUrl, setVerifierUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/setup')
      .then((r) => r.json())
      .then((d) => setUserId(d.userId))
      .catch(() => {})
  }, [])

  function toggle(key: FieldKey) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  async function handleGenerate() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/payments/${payment.id}/disclose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: Array.from(selected),
          disclosedById: userId,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || `Failed to generate: ${res.status}`)
      }

      const data = await res.json()
      const token = data.verifierToken || data.token || data.id
      const base = typeof window !== 'undefined' ? window.location.origin : ''
      setVerifierUrl(`${base}/verify/${token}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!verifierUrl) return
    await navigator.clipboard.writeText(verifierUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hiddenCount = DISCLOSURE_FIELDS.length - selected.size

  return (
    <div className="space-y-5">
      {/* Explanation */}
      <Card>
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-black border border-[#222] flex items-center justify-center shrink-0">
            <Eye className="h-4 w-4 text-[#888]" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Selective Disclosure</p>
            <p className="mt-1 text-xs text-[#888] leading-relaxed">
              Choose only the fields you want to expose. The verifier link will show exactly
              those fields — nothing more. Fields you leave unchecked remain cryptographically hidden.
            </p>
          </div>
        </div>
      </Card>

      {/* Field picker */}
      <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#222]">
          <p className="text-xs font-medium text-[#888] uppercase tracking-wider">
            Fields to disclose
          </p>
        </div>
        <div className="divide-y divide-[#222]">
          {DISCLOSURE_FIELDS.map(({ key, label, description }) => {
            const checked = selected.has(key)
            return (
              <label
                key={key}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-black transition-colors cursor-pointer"
              >
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(key)}
                    className="sr-only"
                  />
                  <div
                    className={`h-4 w-4 rounded border transition-colors ${
                      checked
                        ? 'bg-white border-white'
                        : 'bg-black border-[#333]'
                    }`}
                  >
                    {checked && (
                      <svg viewBox="0 0 10 8" className="h-full w-full p-0.5 text-black" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{label}</p>
                  <p className="text-xs text-[#888]">{description}</p>
                </div>
                {!checked && (
                  <div className="flex items-center gap-1 text-xs text-[#555]">
                    <LockKeyhole className="h-3 w-3" />
                    Hidden
                  </div>
                )}
              </label>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-[#555] px-1">
        <span>{selected.size} field{selected.size !== 1 ? 's' : ''} disclosed</span>
        <span>{hiddenCount} field{hiddenCount !== 1 ? 's' : ''} hidden</span>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded-lg border border-[#333] text-xs text-[#888]">
          {error}
        </div>
      )}

      {/* Verifier URL result */}
      {verifierUrl ? (
        <div className="rounded-xl border border-[#222] bg-[#111] p-4 space-y-3">
          <p className="text-xs font-medium text-[#888] uppercase tracking-wider">Verifier Link</p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-black border border-[#222]">
            <p className="flex-1 text-xs font-mono text-white break-all">{verifierUrl}</p>
            <button
              onClick={handleCopy}
              className="shrink-0 p-1.5 rounded hover:bg-[#222] text-[#888] hover:text-white transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-[#555]">
            Share this link with anyone who needs to verify this payment. It will only show
            the fields you selected above.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVerifierUrl(null)}
          >
            Regenerate with different fields
          </Button>
        </div>
      ) : (
        <Button
          className="w-full"
          size="lg"
          onClick={handleGenerate}
          disabled={loading || selected.size === 0}
        >
          {loading ? 'Generating…' : 'Generate Verifier Link'}
        </Button>
      )}
    </div>
  )
}
