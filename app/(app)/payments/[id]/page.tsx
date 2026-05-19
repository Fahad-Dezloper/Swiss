'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { formatCurrency, formatDate, truncateHash } from '@/lib/utils'

interface Payment {
  id: string
  invoiceId: string | null
  invoice?: { invoiceRef: string } | null
  amount: string
  currency: string
  rail: string
  status: string
  txSignature: string | null
  createdAt: string
  updatedAt: string
  receipt: { receiptHash: string } | null
  proofEvents: Array<{ id: string; proofType: string; createdAt: string }>
}

const statusMap: Record<string, 'pending' | 'delivered' | 'claimed' | 'disclosed' | 'failed'> = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  CLAIMED: 'claimed',
  FAILED: 'failed',
}

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/payments/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Not found`)
        return r.json()
      })
      .then((d) => setPayment(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center text-sm text-[#555]">
        Loading…
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
        <p className="text-sm text-[#888]">Payment not found.</p>
        <Link href="/dashboard" className="text-xs text-[#888] hover:text-white transition-colors">
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  const badgeStatus = statusMap[payment.status] ?? 'pending'
  const amountNum = Number(payment.amount) / 1_000_000
  const invoiceRef = payment.invoice?.invoiceRef ?? payment.invoiceId ?? '—'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-[#888] hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white font-mono">{invoiceRef}</h1>
            <StatusBadge status={badgeStatus} type="payment" />
          </div>
          <p className="mt-0.5 text-sm text-[#888]">Payment detail</p>
        </div>
      </div>

      {/* Payment info */}
      <Card>
        <p className="text-xs text-[#888] uppercase tracking-wider mb-4">Payment</p>
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          <div>
            <p className="text-xs text-[#888]">Amount</p>
            <p className="mt-1 text-lg font-semibold text-white font-mono">
              {formatCurrency(amountNum, payment.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#888]">Rail</p>
            <p className="mt-1 text-sm text-white">{payment.rail}</p>
          </div>
          <div>
            <p className="text-xs text-[#888]">Created</p>
            <p className="mt-1 text-sm text-white">{formatDate(payment.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-[#888]">Updated</p>
            <p className="mt-1 text-sm text-white">{formatDate(payment.updatedAt)}</p>
          </div>
          {payment.txSignature && (
            <div className="col-span-2">
              <p className="text-xs text-[#888]">Transaction Signature</p>
              <p className="mt-1 text-sm font-mono text-[#888] break-all">
                {truncateHash(payment.txSignature, 12)}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Receipt */}
      {payment.receipt && (
        <Card>
          <p className="text-xs text-[#888] uppercase tracking-wider mb-4">Receipt</p>
          <div>
            <p className="text-xs text-[#888]">Receipt Hash</p>
            <p className="mt-1 text-sm font-mono text-white break-all">
              {truncateHash(payment.receipt.receiptHash, 16)}
            </p>
            <p className="mt-1 text-xs text-[#555]">Anchored — tamper-evident</p>
          </div>
        </Card>
      )}

      {/* Proof events */}
      {payment.proofEvents.length > 0 && (
        <Card>
          <p className="text-xs text-[#888] uppercase tracking-wider mb-4">Proof Events</p>
          <div className="space-y-3">
            {payment.proofEvents.map((pe) => (
              <div key={pe.id} className="flex items-center gap-3">
                <StatusBadge
                  status={statusMap[pe.proofType] ?? 'pending'}
                  type="payment"
                />
                <span className="text-xs text-[#888]">{formatDate(pe.createdAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Disclose action */}
      <Link
        href={`/payments/${payment.id}/disclose`}
        className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-[#222] bg-[#111] hover:bg-black transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-black border border-[#222] flex items-center justify-center">
            <Eye className="h-4 w-4 text-[#888]" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Generate Disclosure</p>
            <p className="text-xs text-[#888]">Choose which fields to reveal in a verifier link</p>
          </div>
        </div>
        <span className="text-[#888] group-hover:text-white transition-colors text-sm">→</span>
      </Link>
    </div>
  )
}
