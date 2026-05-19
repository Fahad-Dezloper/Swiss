'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const CURRENCIES = ['USDC', 'USDT', 'DAI', 'ETH']

export default function NewInvoicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)

  const [form, setForm] = useState({
    invoiceRef: '',
    amount: '',
    currency: 'USDC',
    dueDate: '',
    memo: '',
    counterpartyAddress: '',
  })

  useEffect(() => {
    fetch('/api/setup')
      .then((r) => r.json())
      .then((d) => setOrgId(d.orgId))
      .catch(() => {})
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Convert decimal USDC amount to integer micro-units (× 1_000_000)
      const amountMicro = Math.round(parseFloat(form.amount) * 1_000_000)

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceRef: form.invoiceRef,
          amount: String(amountMicro),
          currency: form.currency,
          dueDate: form.dueDate,
          memo: form.memo,
          counterpartyAddress: form.counterpartyAddress,
          orgId,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || `Request failed: ${res.status}`)
      }

      router.push('/invoices')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/invoices" className="text-[#888] hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white">Create Invoice</h1>
          <p className="mt-0.5 text-sm text-[#888]">New private settlement request</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-[#222] bg-[#111] p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Invoice Ref */}
          <div className="space-y-1.5">
            <label htmlFor="invoiceRef" className="block text-xs font-medium text-[#888] uppercase tracking-wider">
              Invoice Reference
            </label>
            <input
              id="invoiceRef"
              name="invoiceRef"
              type="text"
              required
              placeholder="INV-2024-0042"
              value={form.invoiceRef}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-black border border-[#222] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-colors font-mono"
            />
          </div>

          {/* Amount + Currency */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#888] uppercase tracking-wider">
              Amount
            </label>
            <div className="flex gap-2">
              <input
                id="amount"
                name="amount"
                type="number"
                required
                min="0.01"
                step="0.01"
                placeholder="10000.00"
                value={form.amount}
                onChange={handleChange}
                className="flex-1 px-3 py-2 bg-black border border-[#222] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-colors font-mono"
              />
              <select
                name="currency"
                value={form.currency}
                onChange={handleChange}
                className="w-24 px-3 py-2 bg-black border border-[#222] rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-colors"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label htmlFor="dueDate" className="block text-xs font-medium text-[#888] uppercase tracking-wider">
              Due Date
            </label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              required
              value={form.dueDate}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-black border border-[#222] rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-colors"
            />
          </div>

          {/* Counterparty Address */}
          <div className="space-y-1.5">
            <label htmlFor="counterpartyAddress" className="block text-xs font-medium text-[#888] uppercase tracking-wider">
              Recipient Address
            </label>
            <input
              id="counterpartyAddress"
              name="counterpartyAddress"
              type="text"
              placeholder="0x..."
              value={form.counterpartyAddress}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-black border border-[#222] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-colors font-mono"
            />
          </div>

          {/* Memo */}
          <div className="space-y-1.5">
            <label htmlFor="memo" className="block text-xs font-medium text-[#888] uppercase tracking-wider">
              Memo <span className="normal-case text-[#555] font-normal">(private)</span>
            </label>
            <textarea
              id="memo"
              name="memo"
              rows={3}
              placeholder="e.g. Q2 advisory services — retained on file"
              value={form.memo}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-black border border-[#222] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-colors resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 rounded-lg bg-transparent border border-[#333] text-xs text-[#888]">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating…' : 'Create Invoice'}
            </Button>
            <Link href="/invoices">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
