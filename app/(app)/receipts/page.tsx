'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useWallets } from '@privy-io/react-auth/solana'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { truncateAddress, truncateHash, formatDate } from '@/lib/utils'
import { Copy, Check } from 'lucide-react'

type Tab = 'paid' | 'received'

interface ReceiptRow {
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
  if (currency === 'SOL') return (Number(amount) / LAMPORTS_PER_SOL).toFixed(4) + ' SOL'
  return (Number(amount) / 1_000_000).toFixed(2) + ' ' + currency
}

export default function ReceiptsPage() {
  const { wallets } = useWallets()
  const wallet = wallets[0] ?? null
  const address = wallet?.address ?? null

  const [tab, setTab] = useState<Tab>('paid')
  const [receipts, setReceipts] = useState<ReceiptRow[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  async function fetchReceipts(currentTab: Tab, walletAddr: string) {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/receipts?walletAddress=${encodeURIComponent(walletAddr)}&tab=${currentTab}`
      )
      const data = await res.json()
      setReceipts(Array.isArray(data) ? data : [])
    } catch {
      setReceipts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (address) fetchReceipts(tab, address)
    else setReceipts([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, address])

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Receipts</h1>
        <p className="mt-1 text-sm text-[#888]">
          Cryptographic payment receipts for{' '}
          {address ? (
            <span className="font-mono text-white">{truncateAddress(address)}</span>
          ) : 'your wallet'}
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-black border border-[#222] w-fit">
        <button
          onClick={() => setTab('paid')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'paid' ? 'bg-white text-black' : 'text-[#888] hover:text-white'}`}
        >
          Paid
        </button>
        <button
          onClick={() => setTab('received')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'received' ? 'bg-white text-black' : 'text-[#888] hover:text-white'}`}
        >
          Received
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
        {!address ? (
          <div className="px-6 py-10 text-center text-sm text-[#555]">
            Connect your wallet to view receipts.
          </div>
        ) : loading ? (
          <div className="px-6 py-10 text-center text-sm text-[#888]">Loading…</div>
        ) : receipts.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#555]">
            No {tab === 'paid' ? 'paid' : 'received'} receipts yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#222]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">
                  {tab === 'paid' ? 'Recipient' : 'Sender'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Receipt Hash</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {receipts.map((r) => {
                const counterparty = tab === 'paid'
                  ? (r.payment?.recipientAddr ?? r.recipientWallet)
                  : r.senderWallet
                const hashKey = `hash-${r.id}`
                const addrKey = `addr-${r.id}`
                return (
                  <tr key={r.id} className="hover:bg-black transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-white font-mono">
                          {truncateAddress(counterparty)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(counterparty, addrKey)}
                          className="text-[#555] hover:text-white transition-colors"
                        >
                          {copied === addrKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-white font-mono">
                      {r.payment ? formatAmount(r.payment.amount, r.payment.currency) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#888]">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[#888] font-mono" title={r.receiptHash}>
                          {truncateHash(r.receiptHash, 6)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(r.receiptHash, hashKey)}
                          className="text-[#555] hover:text-white transition-colors"
                        >
                          {copied === hashKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/receipt/${r.paymentId}`}
                        className="text-xs text-[#888] hover:text-white underline font-mono"
                      >
                        Sign to view →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
