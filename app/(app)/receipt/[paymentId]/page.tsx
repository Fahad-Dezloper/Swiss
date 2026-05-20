'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useWallets } from '@privy-io/react-auth/solana'
import { LockKeyhole, Unlock, Shield, Copy, Check, AlertTriangle, ExternalLink } from 'lucide-react'
import { truncateAddress, formatDate } from '@/lib/utils'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface ReceiptMeta {
  id: string
  paymentId: string
  receiptHash: string
  senderWallet: string
  recipientWallet: string
  createdAt: string
  payment: {
    id: string
    type: string
    status: string
    amount: string
    currency: string
    recipientAddr: string
    rail: string
    createdAt: string
    payrollRun: { periodLabel: string } | null
  } | null
}

interface ViewData {
  receipt: {
    id: string
    receiptHash: string
    senderWallet: string
    recipientWallet: string
  }
  payment: {
    id: string
    type: string
    status: string
    txSignature: string | null
    amount: string
    currency: string
    recipientAddr: string
    rail: string
    createdAt: string
    payrollRunId: string | null
  }
}

export default function ReceiptPage() {
  const params = useParams()
  const paymentId = params.paymentId as string

  const { wallets } = useWallets()
  const connectedWallet = wallets[0] ?? null
  const address = connectedWallet?.address ?? null

  const [meta, setMeta] = useState<ReceiptMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [viewData, setViewData] = useState<ViewData | null>(null)
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/receipts/${paymentId}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then((data) => { if (data) setMeta(data) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [paymentId])

  const isAuthorized = address && meta && (
    meta.senderWallet === address || meta.recipientWallet === address
  )

  const handleSignToView = useCallback(async () => {
    if (!meta || !address || !connectedWallet) return

    setSigning(true)
    setSignError(null)

    try {
      const timestamp = Date.now()
      const message = `PSR:decrypt:${meta.receiptHash}:${timestamp}`
      const messageBytes = new TextEncoder().encode(message)

      const { signature } = await connectedWallet.signMessage({ message: messageBytes })
      const signatureHex = toHex(signature)

      const res = await fetch(`/api/receipts/${paymentId}/decrypt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          signature: signatureHex,
          walletAddress: address,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || `Failed: ${res.status}`)
      }

      const data: ViewData = await res.json()
      setViewData(data)
    } catch (err) {
      setSignError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setSigning(false)
    }
  }, [meta, address, connectedWallet, paymentId])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function formatAmount(amount: string, currency: string): string {
    if (currency === 'SOL') {
      return (Number(amount) / LAMPORTS_PER_SOL).toFixed(4) + ' SOL'
    }
    return (Number(amount) / 1_000_000).toFixed(2) + ' ' + currency
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#888]">
        Loading…
      </div>
    )
  }

  if (notFound || !meta) {
    return (
      <div className="text-center py-24 space-y-3">
        <p className="text-sm text-[#888]">Receipt not found.</p>
        <Link href="/receipts" className="text-xs text-white underline">
          Back to Receipts
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/receipts" className="text-[#888] hover:text-white text-sm">
          ← Receipts
        </Link>
        <span className="text-[#444]">/</span>
        <h1 className="text-xl font-semibold text-white">Receipt</h1>
      </div>

      {/* Receipt Card */}
      <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
        <div className="px-6 py-5 flex items-center gap-4 border-b border-[#222]">
          <div className="h-10 w-10 rounded-lg bg-black border border-[#222] flex items-center justify-center shrink-0">
            {viewData ? (
              <Unlock className="h-5 w-5 text-white" />
            ) : (
              <LockKeyhole className="h-5 w-5 text-[#888]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
              {viewData ? 'Details Verified' : 'Protected Receipt'}
            </p>
            <p className="text-xs text-[#888] mt-0.5">
              {viewData
                ? 'Wallet ownership verified — full details below'
                : 'Sign with your wallet to view full transaction details'}
            </p>
          </div>
        </div>

        {/* Payment summary (always visible) */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs font-medium text-[#888] uppercase tracking-wider">
            Payment Summary
          </p>
          <div className="grid grid-cols-2 gap-4">
            <FieldRow
              label="Amount"
              value={meta.payment ? formatAmount(meta.payment.amount, meta.payment.currency) : '—'}
            />
            <FieldRow label="Status" value={meta.payment?.status ?? '—'} />
            <FieldRow
              label="Recipient"
              value={truncateAddress(meta.payment?.recipientAddr ?? '')}
              mono
            />
            <FieldRow
              label="Period"
              value={meta.payment?.payrollRun?.periodLabel ?? '—'}
              mono
            />
          </div>
        </div>

        {/* Authorized wallets */}
        <div className="px-6 py-4 border-t border-[#222] bg-black/30">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-3.5 w-3.5 text-[#888]" />
            <p className="text-xs font-medium text-[#888] uppercase tracking-wider">
              Authorized Wallets
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#888]">Sender</span>
              <span className="text-xs text-white font-mono">
                {meta.senderWallet ? truncateAddress(meta.senderWallet, 6) : '—'}
                {address && meta.senderWallet === address && (
                  <span className="ml-2 text-[#888]">(you)</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#888]">Recipient</span>
              <span className="text-xs text-white font-mono">
                {meta.recipientWallet ? truncateAddress(meta.recipientWallet, 6) : '—'}
                {address && meta.recipientWallet === address && (
                  <span className="ml-2 text-[#888]">(you)</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sign to View section */}
      {!viewData && (
        <div className="rounded-xl border border-[#222] bg-[#111] p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <LockKeyhole className="h-4 w-4" />
              Sign to View Details
            </h2>
            <p className="text-xs text-[#888] leading-relaxed">
              Prove wallet ownership by signing a message. Only the sender or recipient
              can view full transaction details and the on-chain signature.
            </p>
          </div>

          {!address && (
            <p className="text-xs text-[#555]">
              Connect your wallet to view this receipt.
            </p>
          )}

          {address && !isAuthorized && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-[#333] bg-black/30">
              <AlertTriangle className="h-4 w-4 text-[#888] mt-0.5 shrink-0" />
              <p className="text-xs text-[#888]">
                Your wallet ({truncateAddress(address)}) is not authorized.
                Connect the sender or recipient wallet.
              </p>
            </div>
          )}

          {signError && (
            <div className="px-3 py-2 rounded-lg border border-[#333] text-xs text-[#888]">
              {signError}
            </div>
          )}

          <button
            onClick={handleSignToView}
            disabled={signing || !isAuthorized}
            className="w-full px-4 py-3 rounded-lg bg-white text-black text-sm font-medium hover:bg-[#e0e0e0] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {signing ? 'Approve in wallet…' : 'Sign & View Details'}
          </button>
        </div>
      )}

      {/* Verified transaction details */}
      {viewData && (
        <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#222] flex items-center gap-2">
            <Unlock className="h-4 w-4 text-white" />
            <p className="text-xs font-medium text-[#888] uppercase tracking-wider">
              Transaction Details
            </p>
          </div>

          <div className="px-6 py-5 space-y-3">
            {viewData.payment.txSignature && (
              <div className="flex items-start justify-between gap-4 py-2 border-b border-[#222]">
                <span className="text-xs text-[#888] shrink-0 pt-0.5">Transaction</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-white font-mono truncate max-w-[220px]" title={viewData.payment.txSignature}>
                    {viewData.payment.txSignature}
                  </span>
                  <button
                    onClick={() => copyToClipboard(viewData.payment.txSignature!, 'tx')}
                    className="shrink-0 text-[#555] hover:text-white transition-colors"
                  >
                    {copied === 'tx' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                  <a
                    href={`https://explorer.solana.com/tx/${viewData.payment.txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[#555] hover:text-white transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            <DetailRow label="Payment ID" value={viewData.payment.id} mono onCopy={copyToClipboard} copied={copied} />
            <DetailRow label="Amount" value={formatAmount(viewData.payment.amount, viewData.payment.currency)} />
            <DetailRow label="Status" value={viewData.payment.status} />
            <DetailRow label="Recipient" value={viewData.payment.recipientAddr} mono onCopy={copyToClipboard} copied={copied} />
            <DetailRow label="Type" value={viewData.payment.type} />
            <DetailRow label="Rail" value={viewData.payment.rail} />
            <DetailRow label="Date" value={formatDate(viewData.payment.createdAt)} />
            <DetailRow label="Receipt Hash" value={viewData.receipt.receiptHash} mono onCopy={copyToClipboard} copied={copied} />
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-xl border border-[#222] bg-[#111] p-5 space-y-3">
        <p className="text-xs font-medium text-[#888] uppercase tracking-wider">
          How it works
        </p>
        <p className="text-sm text-[#888] leading-relaxed">
          Every payout is a real Solana transaction on devnet. The transaction signature
          is stored as the receipt. To view full details, you prove wallet ownership
          by signing a message — only the sender or recipient can access this data.
        </p>
      </div>
    </div>
  )
}

function FieldRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-[#888] mb-0.5">{label}</p>
      <p className={`text-sm text-white ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono = false,
  onCopy,
  copied,
}: {
  label: string
  value: string
  mono?: boolean
  onCopy?: (text: string, key: string) => void
  copied?: string | null
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-[#222] last:border-0">
      <span className="text-xs text-[#888] shrink-0 pt-0.5">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`text-sm text-white text-right truncate max-w-[300px] ${mono ? 'font-mono' : ''}`}
          title={value}
        >
          {value}
        </span>
        {onCopy && (
          <button
            onClick={() => onCopy(value, label)}
            className="shrink-0 text-[#555] hover:text-white transition-colors"
          >
            {copied === label ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
      </div>
    </div>
  )
}
