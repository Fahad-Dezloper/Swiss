'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useWallets } from '@privy-io/react-auth/solana'
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { truncateAddress, formatDate } from '@/lib/utils'
import { CheckCircle, FileDown, BookUser } from 'lucide-react'

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

interface Contact { id: string; alias: string; destinationRef: string }

interface Payment {
  id: string
  recipientAddr: string
  amount: string
  currency: string
  status: string
  txSignature: string | null
  createdAt: string
}

interface PayrollRun {
  id: string
  periodLabel: string
  status: string
  createdAt: string
  payments: Payment[]
}

export default function PayrollRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { wallets } = useWallets()
  const connectedWallet = wallets[0] ?? null

  const [run, setRun] = useState<PayrollRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [completing, setCompleting] = useState(false)

  // Contacts for address picker
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showPicker, setShowPicker] = useState(false)

  // Payout form
  const [recipientAddr, setRecipientAddr] = useState('')
  const [amount, setAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendStep, setSendStep] = useState<'idle' | 'building' | 'signing' | 'confirming' | 'recording'>('idle')

  async function fetchRun() {
    try {
      const res = await fetch(`/api/payroll-runs/${id}`)
      if (res.status === 404) { setNotFound(true); return }
      const data: PayrollRun = await res.json()
      setRun(data)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRun()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!connectedWallet?.address) return
    fetch(`/api/contacts?walletAddress=${encodeURIComponent(connectedWallet.address)}`)
      .then((r) => r.json())
      .then((d) => setContacts(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [connectedWallet?.address])

  async function handleComplete() {
    if (!run || run.status === 'COMPLETED') return
    setCompleting(true)
    try {
      const res = await fetch(`/api/payroll-runs/${id}/complete`, { method: 'POST' })
      if (res.ok) {
        setRun((prev) => prev ? { ...prev, status: 'COMPLETED' } : prev)
      }
    } finally {
      setCompleting(false)
    }
  }

  async function handlePayout(e: React.FormEvent) {
    e.preventDefault()
    if (!recipientAddr.trim() || !amount.trim()) return
    if (!connectedWallet) { setSendError('Connect a Solana wallet first'); return }

    setSending(true)
    setSendError(null)

    try {
      setSendStep('building')
      const connection = new Connection(RPC_URL, 'confirmed')
      const senderPubkey = new PublicKey(connectedWallet.address)

      let recipientPubkey: PublicKey
      try {
        recipientPubkey = new PublicKey(recipientAddr.trim())
      } catch {
        throw new Error('Invalid recipient Solana address')
      }

      const solAmount = parseFloat(amount.trim())
      if (isNaN(solAmount) || solAmount <= 0) throw new Error('Amount must be a positive number')
      const lamports = Math.round(solAmount * LAMPORTS_PER_SOL)

      const transaction = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: senderPubkey, toPubkey: recipientPubkey, lamports })
      )
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      transaction.feePayer = senderPubkey

      setSendStep('signing')
      let txSignature: string
      try {
        const serialized = transaction.serialize({ requireAllSignatures: false })
        const { signedTransaction } = await connectedWallet.signTransaction({ transaction: serialized })
        txSignature = await connection.sendRawTransaction(signedTransaction)
      } catch (signErr) {
        throw new Error(signErr instanceof Error ? `Wallet rejected: ${signErr.message}` : 'Wallet signing failed')
      }

      setSendStep('confirming')
      await connection.confirmTransaction({ signature: txSignature, blockhash, lastValidBlockHeight }, 'confirmed')

      setSendStep('recording')
      const res = await fetch(`/api/payroll-runs/${id}/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientAddr: recipientAddr.trim(),
          amount: String(lamports),
          currency: 'SOL',
          txSignature,
          senderWallet: connectedWallet.address,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || `Failed: ${res.status}`)
      }

      setRecipientAddr('')
      setAmount('')
      await fetchRun()
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSending(false)
      setSendStep('idle')
    }
  }

  function formatSol(lamports: string): string {
    return (Number(lamports) / LAMPORTS_PER_SOL).toFixed(4) + ' SOL'
  }

  const totalSol = run
    ? run.payments.reduce((sum, p) => sum + Number(p.amount) / LAMPORTS_PER_SOL, 0)
    : 0

  const stepLabel: Record<string, string> = {
    building: 'Building transaction…',
    signing: 'Approve in wallet…',
    confirming: 'Confirming on-chain…',
    recording: 'Recording receipt…',
  }

  if (loading) return <div className="flex items-center justify-center py-24 text-sm text-[#888]">Loading…</div>
  if (notFound || !run) return (
    <div className="text-center py-24 space-y-3">
      <p className="text-sm text-[#888]">Payroll run not found.</p>
      <Link href="/payroll" className="text-xs text-white underline">Back to Payroll</Link>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link href="/payroll" className="text-[#888] hover:text-white text-sm">← Payroll</Link>
            <span className="text-[#444]">/</span>
            <h1 className="text-xl font-semibold text-white font-mono">{run.periodLabel}</h1>
          </div>
          <p className="text-xs text-[#888]">Created {formatDate(run.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/payroll/${id}/export`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#222] text-xs text-[#888] hover:text-white hover:border-[#444] transition-colors"
          >
            <FileDown className="h-3.5 w-3.5" />
            Export
          </Link>
          {run.status !== 'COMPLETED' && (
            <button
              onClick={handleComplete}
              disabled={completing || run.payments.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-medium hover:bg-[#e0e0e0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {completing ? 'Completing…' : 'Mark Complete'}
            </button>
          )}
          <span className="inline-flex items-center px-2 py-0.5 rounded border border-[#333] text-xs text-[#888] font-mono uppercase">
            {run.status}
          </span>
        </div>
      </div>

      {/* Summary bar */}
      {run.payments.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Recipients', value: String(run.payments.length) },
            { label: 'Total Paid', value: `${totalSol.toFixed(4)} SOL` },
            { label: 'Status', value: run.status },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-[#222] bg-[#111] px-4 py-3">
              <p className="text-xs text-[#888]">{label}</p>
              <p className="text-sm text-white font-mono mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Payments table */}
      <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
        <div className="px-6 py-3 border-b border-[#222]">
          <span className="text-xs text-[#888] uppercase tracking-wider font-medium">
            Payments ({run.payments.length})
          </span>
        </div>
        {run.payments.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#888]">No payments yet. Add a payout below.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#222]">
                {['Recipient', 'Amount', 'Tx', 'Date', 'Receipt'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs text-[#888] uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {run.payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-black/30">
                  <td className="px-6 py-4 font-mono text-white">{truncateAddress(payment.recipientAddr)}</td>
                  <td className="px-6 py-4 font-mono text-white">{formatSol(payment.amount)}</td>
                  <td className="px-6 py-4">
                    {payment.txSignature ? (
                      <a
                        href={`https://explorer.solana.com/tx/${payment.txSignature}?cluster=devnet`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#888] hover:text-white underline font-mono"
                      >
                        explorer ↗
                      </a>
                    ) : <span className="text-xs text-[#555]">—</span>}
                  </td>
                  <td className="px-6 py-4 text-[#888]">{formatDate(payment.createdAt)}</td>
                  <td className="px-6 py-4">
                    <Link href={`/receipt/${payment.id}`} className="text-xs text-[#888] hover:text-white underline font-mono">
                      view →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Payout */}
      {run.status !== 'COMPLETED' && (
        <div className="rounded-xl border border-[#222] bg-[#111] p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Send Payout</h2>
              <p className="text-xs text-[#888] mt-1">Real SOL transfer on Solana devnet, confirmed on-chain.</p>
            </div>
            {contacts.length > 0 && (
              <button
                onClick={() => setShowPicker(!showPicker)}
                className="flex items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors"
              >
                <BookUser className="h-3.5 w-3.5" />
                {showPicker ? 'Hide' : 'Pick from contacts'}
              </button>
            )}
          </div>

          {/* Contact picker */}
          {showPicker && contacts.length > 0 && (
            <div className="rounded-lg border border-[#222] bg-black divide-y divide-[#222]">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setRecipientAddr(c.destinationRef); setShowPicker(false) }}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#111] transition-colors text-left"
                >
                  <span className="text-sm text-white">{c.alias}</span>
                  <span className="text-xs text-[#555] font-mono">{truncateAddress(c.destinationRef, 6)}</span>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handlePayout} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#888] uppercase tracking-wider">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipientAddr}
                onChange={(e) => setRecipientAddr(e.target.value)}
                placeholder="Solana address…"
                className="w-full px-3 py-2 bg-black border border-[#222] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-white focus:border-white font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#888] uppercase tracking-wider">Amount (SOL)</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 0.1"
                className="w-full px-3 py-2 bg-black border border-[#222] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-white focus:border-white font-mono"
                required
              />
              <p className="text-xs text-[#555]">
                Devnet SOL — get free SOL from{' '}
                <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="text-[#888] hover:text-white underline">
                  faucet.solana.com
                </a>
              </p>
            </div>

            {sendError && (
              <div className="px-3 py-2 rounded-lg border border-[#333] text-xs text-[#888]">{sendError}</div>
            )}

            {!connectedWallet && (
              <p className="text-xs text-[#555]">Connect a Solana wallet from the sidebar to send payouts.</p>
            )}

            <button
              type="submit"
              disabled={sending || !recipientAddr.trim() || !amount.trim() || !connectedWallet}
              className="px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-[#e0e0e0] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sendStep !== 'idle' ? stepLabel[sendStep] : connectedWallet ? 'Sign & Send on Devnet' : 'Connect Wallet First'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
