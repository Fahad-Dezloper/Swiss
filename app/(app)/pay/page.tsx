'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useWallets } from '@privy-io/react-auth/solana'
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useUmbraClient } from '@/hooks/use-umbra-client'
import { truncateAddress, formatDate } from '@/lib/utils'
import { Send, ShieldCheck, Zap } from 'lucide-react'

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const USDC_DECIMALS = 6

interface RecentSend {
  id: string
  paymentId: string
  receiptHash: string
  senderWallet: string
  recipientWallet: string
  createdAt: string
  payment: {
    id: string
    amount: string
    currency: string
    status: string
    txSignature: string | null
    recipientAddr: string
    rail: string
    createdAt: string
    payrollRun: { periodLabel: string } | null
  } | null
}

function formatAmount(amount: string, currency: string): string {
  if (currency === 'USDC') {
    return (Number(amount) / 10 ** USDC_DECIMALS).toFixed(2) + ' USDC'
  }
  return (Number(amount) / LAMPORTS_PER_SOL).toFixed(4) + ' SOL'
}

export default function PayPage() {
  const { wallets } = useWallets()
  const connectedWallet = wallets[0] ?? null
  const address = connectedWallet?.address ?? null

  const umbra = useUmbraClient(connectedWallet)

  const [recipientAddr, setRecipientAddr] = useState('')
  const [amount, setAmount] = useState('')
  const [rail, setRail] = useState<'umbra' | 'sol'>('umbra')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendStep, setSendStep] = useState<string>('idle')

  const [recentSends, setRecentSends] = useState<RecentSend[]>([])
  const [loadingRecent, setLoadingRecent] = useState(false)

  const [recipientRegistered, setRecipientRegistered] = useState<boolean | null>(null)
  const [checkingRecipient, setCheckingRecipient] = useState(false)

  async function fetchRecentSends() {
    if (!address) return
    setLoadingRecent(true)
    try {
      const res = await fetch(`/api/receipts?walletAddress=${encodeURIComponent(address)}&tab=paid`)
      const data = await res.json()
      setRecentSends(Array.isArray(data) ? data : [])
    } catch {
      setRecentSends([])
    } finally {
      setLoadingRecent(false)
    }
  }

  useEffect(() => {
    if (address) fetchRecentSends()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  // Check if recipient is registered on Umbra
  useEffect(() => {
    if (rail !== 'umbra' || !recipientAddr.trim() || umbra.status !== 'ready') {
      setRecipientRegistered(null)
      return
    }
    let cancelled = false
    setCheckingRecipient(true)
    umbra.checkRecipientRegistered(recipientAddr.trim()).then((registered) => {
      if (!cancelled) { setRecipientRegistered(registered); setCheckingRecipient(false) }
    }).catch(() => { if (!cancelled) setCheckingRecipient(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rail, recipientAddr, umbra.status])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!recipientAddr.trim() || !amount.trim()) return
    if (!connectedWallet) { setSendError('Connect a Solana wallet first'); return }

    setSending(true)
    setSendError(null)

    try {
      if (rail === 'umbra') {
        if (!umbra.isRegistered) throw new Error('Register with Umbra first (click Register below)')
        if (recipientRegistered === false) throw new Error('Recipient has not registered with Umbra')

        const usdcAmount = parseFloat(amount.trim())
        if (isNaN(usdcAmount) || usdcAmount <= 0) throw new Error('Amount must be positive')
        const microUsdc = BigInt(Math.round(usdcAmount * 10 ** USDC_DECIMALS))

        const { txSignature } = await umbra.sendUsdc({
          recipientAddress: recipientAddr.trim(),
          amount: microUsdc,
          onStep: (step) => setSendStep(step),
        })

        setSendStep('Recording receipt…')
        const res = await fetch('/api/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientAddr: recipientAddr.trim(),
            amount: String(microUsdc),
            currency: 'USDC',
            txSignature,
            senderWallet: connectedWallet.address,
            rail: 'umbra',
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error((data as { error?: string }).error || `Failed: ${res.status}`)
        }
      } else {
        // SOL Direct
        setSendStep('Building transaction…')
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

        setSendStep('Approve in wallet…')
        let txSignature: string
        try {
          const serialized = transaction.serialize({ requireAllSignatures: false })
          const { signedTransaction } = await connectedWallet.signTransaction({ transaction: serialized })
          txSignature = await connection.sendRawTransaction(signedTransaction)
        } catch (signErr) {
          throw new Error(signErr instanceof Error ? `Wallet rejected: ${signErr.message}` : 'Wallet signing failed')
        }

        setSendStep('Confirming on-chain…')
        await connection.confirmTransaction({ signature: txSignature, blockhash, lastValidBlockHeight }, 'confirmed')

        setSendStep('Recording receipt…')
        const res = await fetch('/api/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientAddr: recipientAddr.trim(),
            amount: String(lamports),
            currency: 'SOL',
            txSignature,
            senderWallet: connectedWallet.address,
            rail: 'solana',
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error((data as { error?: string }).error || `Failed: ${res.status}`)
        }
      }

      setRecipientAddr('')
      setAmount('')
      await fetchRecentSends()
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSending(false)
      setSendStep('idle')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Send Payment card */}
      <div className="rounded-xl border border-[#222] bg-[#111] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-white" />
          <h1 className="text-sm font-semibold text-white">Send Payment</h1>
        </div>
        <p className="text-xs text-[#888]">
          {rail === 'umbra'
            ? 'Private USDC transfer via Umbra stealth pool — no on-chain link between sender and recipient.'
            : 'Direct SOL transfer on Solana devnet, confirmed on-chain.'}
        </p>

        {/* Rail toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-black border border-[#222] w-fit">
          <button
            type="button"
            onClick={() => setRail('sol')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${rail === 'sol' ? 'bg-white text-black' : 'text-[#888] hover:text-white'}`}
          >
            <Zap className="h-3 w-3" />
            SOL Direct
          </button>
          <button
            type="button"
            onClick={() => setRail('umbra')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${rail === 'umbra' ? 'bg-white text-black' : 'text-[#888] hover:text-white'}`}
          >
            <ShieldCheck className="h-3 w-3" />
            Umbra Private
          </button>
        </div>

        {/* Umbra status bar */}
        {rail === 'umbra' && connectedWallet && (
          <div className="rounded-lg border border-[#222] bg-black px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${umbra.status === 'ready' ? 'bg-white' : umbra.status === 'error' ? 'bg-[#888]' : 'bg-[#555] animate-pulse'}`} />
                <span className="text-xs text-[#888]">
                  {umbra.status === 'idle' && 'Umbra not initialized'}
                  {umbra.status === 'initializing' && 'Connecting to Umbra…'}
                  {umbra.status === 'registering' && 'Registering on Umbra…'}
                  {umbra.status === 'ready' && (umbra.isRegistered ? 'Registered on Umbra' : 'Connected — not registered')}
                  {umbra.status === 'error' && `Error: ${umbra.error}`}
                </span>
              </div>
              {umbra.status === 'ready' && !umbra.isRegistered && (
                <button
                  type="button"
                  onClick={umbra.register}
                  className="text-xs text-white underline hover:no-underline"
                >
                  Register →
                </button>
              )}
            </div>
            {umbra.isRegistered && (
              <p className="text-[10px] text-[#555]">
                Recipient must also be registered on Umbra to receive stealth transfers.
                ZK proof generation takes ~30–60s.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-4">
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
            {rail === 'umbra' && recipientAddr.trim() && (
              <p className="text-xs">
                {checkingRecipient
                  ? <span className="text-[#555]">Checking Umbra registration…</span>
                  : recipientRegistered === true
                  ? <span className="text-white">✓ Recipient registered on Umbra</span>
                  : recipientRegistered === false
                  ? <span className="text-[#555]">Recipient not yet on PSR — they&apos;ll claim once they join and register on Umbra</span>
                  : null}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#888] uppercase tracking-wider">
              Amount ({rail === 'umbra' ? 'USDC' : 'SOL'})
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={rail === 'umbra' ? 'e.g. 100' : 'e.g. 0.1'}
              className="w-full px-3 py-2 bg-black border border-[#222] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-white focus:border-white font-mono"
              required
            />
            <p className="text-xs text-[#555]">
              {rail === 'umbra'
                ? 'Devnet USDC — swap from devnet SOL on Jupiter.'
                : <>Devnet SOL — get free SOL from{' '}
                  <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="text-[#888] hover:text-white underline">faucet.solana.com</a></>}
            </p>
          </div>

          {sendError && (
            <div className="px-3 py-2 rounded-lg border border-[#333] text-xs text-[#888]">{sendError}</div>
          )}

          {!connectedWallet && (
            <p className="text-xs text-[#555]">Connect a Solana wallet to send payments.</p>
          )}

          <button
            type="submit"
            disabled={
              sending || !recipientAddr.trim() || !amount.trim() || !connectedWallet ||
              (rail === 'umbra' && !umbra.isRegistered)
            }
            className="px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-[#e0e0e0] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sendStep !== 'idle'
              ? sendStep
              : connectedWallet
                ? rail === 'umbra' ? 'Send via Umbra (Private)' : 'Sign & Send on Devnet'
                : 'Connect Wallet First'}
          </button>
        </form>
      </div>

      {/* Recent Sends card */}
      <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
        <div className="px-6 py-3 border-b border-[#222]">
          <span className="text-xs text-[#888] uppercase tracking-wider font-medium">Recent Sends</span>
        </div>
        {!address ? (
          <div className="px-6 py-10 text-center text-sm text-[#555]">Connect wallet to see recent sends.</div>
        ) : loadingRecent ? (
          <div className="px-6 py-10 text-center text-sm text-[#888]">Loading…</div>
        ) : recentSends.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#555]">No sends yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#222]">
                {['Recipient', 'Amount', 'Date', 'Receipt'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs text-[#888] uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {recentSends.map((send) => (
                <tr key={send.id} className="hover:bg-black/30">
                  <td className="px-6 py-4 font-mono text-white text-xs">
                    {truncateAddress(send.payment?.recipientAddr ?? send.recipientWallet)}
                  </td>
                  <td className="px-6 py-4 font-mono text-white text-xs">
                    {send.payment ? formatAmount(send.payment.amount, send.payment.currency) : '—'}
                  </td>
                  <td className="px-6 py-4 text-[#888] text-xs">
                    {formatDate(send.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/receipt/${send.paymentId}`}
                      className="text-xs text-[#888] hover:text-white underline font-mono"
                    >
                      view →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
