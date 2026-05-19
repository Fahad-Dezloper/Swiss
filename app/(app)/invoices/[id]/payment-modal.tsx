'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { LockKeyhole, X, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Invoice {
  id: string
  invoiceRef: string
  amount: number
  currency: string
  counterpartyAddress: string
}

export default function PaymentModal({ invoice }: { invoice: Invoice }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [recipientAddr, setRecipientAddr] = useState(invoice.counterpartyAddress)
  const [paying, setPaying] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [proofToken, setProofToken] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [senderUserId, setSenderUserId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/setup')
      .then((r) => r.json())
      .then((d) => setSenderUserId(d.userId))
      .catch(() => {})
  }, [])

  async function handlePay() {
    setPaying(true)
    setPaymentStatus('sending')
    setErrorMsg(null)

    try {
      const txSignature = `dev-sim-${Date.now()}`

      const res = await fetch(`/api/invoices/${invoice.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderUserId,
          recipientAddr,
          txSignature,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || `Payment failed: ${res.status}`)
      }

      const data = await res.json()
      setProofToken(data.proofToken ?? null)
      setPaymentId(data.payment?.id ?? null)
      setPaymentStatus('sent')
      router.refresh()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Payment failed')
      setPaymentStatus('error')
    } finally {
      setPaying(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full" size="lg">
        <LockKeyhole className="h-4 w-4" />
        Pay Privately
      </Button>

      {/* Modal backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => paymentStatus !== 'sending' && setOpen(false)}
          />

          <div className="relative z-10 w-full max-w-md rounded-xl border border-[#222] bg-[#111] p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-white flex items-center justify-center">
                  <LockKeyhole className="h-3.5 w-3.5 text-black" />
                </div>
                <span className="text-sm font-semibold text-white">Private Payment</span>
              </div>
              <button
                onClick={() => paymentStatus !== 'sending' && setOpen(false)}
                className="text-[#888] hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {paymentStatus === 'sent' ? (
              /* Success state */
              <div className="text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-transparent border border-[#555] flex items-center justify-center mx-auto">
                  <span className="text-xl text-white">✓</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Payment submitted</p>
                  <p className="mt-1 text-xs text-[#888]">
                    Routed via stealth protocol. Receipt generated.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <StatusBadge status="delivered" type="payment" />
                </div>
                {proofToken && (
                  <div className="rounded-lg border border-[#222] p-3 text-left space-y-1">
                    <p className="text-xs text-[#888]">Proof Token</p>
                    <p className="text-xs font-mono text-white break-all">{proofToken}</p>
                    <a
                      href={`/verify/${proofToken}`}
                      className="text-xs text-[#888] hover:text-white underline transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open verifier link →
                    </a>
                  </div>
                )}
                {paymentId && (
                  <a
                    href={`/payments/${paymentId}`}
                    className="block text-xs text-[#888] hover:text-white transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    View payment details →
                  </a>
                )}
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  Close
                </Button>
              </div>
            ) : (
              /* Input state */
              <div className="space-y-5">
                {/* Invoice summary */}
                <div className="rounded-lg bg-black border border-[#222] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#888]">Invoice</span>
                    <span className="text-xs font-mono text-white">{invoice.invoiceRef}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#888]">Amount</span>
                    <span className="text-sm font-semibold font-mono text-white">
                      {formatCurrency(invoice.amount / 1_000_000, invoice.currency)}
                    </span>
                  </div>
                </div>

                {/* Recipient */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wider">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    value={recipientAddr}
                    onChange={(e) => setRecipientAddr(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 bg-black border border-[#222] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-colors font-mono"
                  />
                </div>

                {/* Privacy note */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-[#222]">
                  <LockKeyhole className="h-3.5 w-3.5 text-[#888] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#888] leading-relaxed">
                    Payment is routed through a one-time stealth address. The on-chain transaction
                    will not reveal the recipient&apos;s identity.
                  </p>
                </div>

                {errorMsg && (
                  <div className="px-3 py-2 rounded-lg border border-[#333] text-xs text-[#888]">
                    {errorMsg}
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePay}
                  disabled={paying || !recipientAddr}
                >
                  <Wallet className="h-4 w-4" />
                  {paying ? 'Sending…' : 'Connect Wallet & Pay'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
