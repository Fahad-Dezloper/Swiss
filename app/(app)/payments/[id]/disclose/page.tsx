'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import DisclosureForm from './disclosure-form'

interface Payment {
  id: string
  invoiceId: string | null
  invoice?: { invoiceRef: string } | null
  amount: string
  currency: string
}

export default function DisclosurePage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/payments/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found')
        return r.json()
      })
      .then((d) => setPayment(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center text-sm text-[#555]">Loading…</div>
    )
  }

  if (error || !payment) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-4">
        <p className="text-sm text-[#888]">Payment not found.</p>
        <Link href="/dashboard" className="text-xs text-[#888] hover:text-white transition-colors">
          ← Back
        </Link>
      </div>
    )
  }

  const invoiceRef = payment.invoice?.invoiceRef ?? payment.invoiceId ?? '—'

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/payments/${id}`} className="text-[#888] hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white">Generate Disclosure</h1>
          <p className="mt-0.5 text-sm text-[#888] font-mono">{invoiceRef}</p>
        </div>
      </div>

      <DisclosureForm payment={{ id: payment.id, invoiceRef, amount: Number(payment.amount) / 1_000_000, currency: payment.currency }} />
    </div>
  )
}
