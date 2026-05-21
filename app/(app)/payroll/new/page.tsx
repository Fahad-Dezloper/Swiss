'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewPayrollPage() {
  const router = useRouter()
  const [periodLabel, setPeriodLabel] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!periodLabel.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/payroll-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodLabel: periodLabel.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || `Failed: ${res.status}`)
      }

      const run = await res.json()
      router.push(`/payroll/${run.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/payroll" className="text-[#888] hover:text-white text-sm">
          ← Payroll
        </Link>
        <span className="text-[#444]">/</span>
        <h1 className="text-xl font-semibold text-white">New Run</h1>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-[#222] bg-[#111] p-6 space-y-5"
      >
        <div className="space-y-1.5">
          <label
            htmlFor="periodLabel"
            className="block text-xs font-medium text-[#888] uppercase tracking-wider"
          >
            Period Label
          </label>
          <input
            id="periodLabel"
            type="text"
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            placeholder="e.g. 2026-Q2-W1"
            className="w-full px-3 py-2 bg-black border border-[#222] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-white focus:border-white font-mono"
            required
          />
          <p className="text-xs text-[#888]">A short label identifying this payroll period.</p>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg border border-[#333] text-xs text-[#888]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !periodLabel.trim()}
          className="w-full px-4 py-2.5 rounded-lg bg-[#43AED6] text-white text-sm font-medium hover:bg-[#3a9dc3] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Creating…' : 'Create Payroll Run'}
        </button>
      </form>
    </div>
  )
}
