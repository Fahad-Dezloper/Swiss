'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface PayrollRun {
  id: string
  periodLabel: string
  status: string
  paymentCount: number
  createdAt: string
}

export default function PayrollPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/payroll-runs')
      .then((r) => r.json())
      .then((data: PayrollRun[]) => {
        setRuns(Array.isArray(data) ? data : [])
      })
      .catch(() => setRuns([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Payroll</h1>
        <Link
          href="/payroll/new"
          className="px-3 py-2 rounded-lg bg-[#43AED6] text-white text-sm font-medium hover:bg-[#3a9dc3] focus:outline-none"
        >
          New Run
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-[#888]">Loading…</div>
        ) : runs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[#888]">No payroll runs yet.</p>
            <Link
              href="/payroll/new"
              className="mt-3 inline-block text-xs text-white underline"
            >
              Create your first run →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#222]">
                <th className="px-6 py-3 text-left text-xs text-[#888] uppercase tracking-wider font-medium">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs text-[#888] uppercase tracking-wider font-medium">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs text-[#888] uppercase tracking-wider font-medium">
                  Payments
                </th>
                <th className="px-6 py-3 text-left text-xs text-[#888] uppercase tracking-wider font-medium">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-black/30">
                  <td className="px-6 py-4">
                    <Link
                      href={`/payroll/${run.id}`}
                      className="text-white font-mono hover:underline"
                    >
                      {run.periodLabel}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded border border-[#333] text-xs text-[#888] font-mono uppercase">
                      {run.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#888] font-mono">{run.paymentCount}</td>
                  <td className="px-6 py-4 text-[#888]">{formatDate(run.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
