'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useWallets } from '@privy-io/react-auth/solana'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useUmbraClient, type ClaimableUtxo } from '@/hooks/use-umbra-client'
import { truncateAddress, formatDate } from '@/lib/utils'
import { Download, ShieldCheck } from 'lucide-react'

interface ReceivedReceipt {
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

export default function ClaimPage() {
  const { wallets } = useWallets()
  const wallet = wallets[0] ?? null
  const address = wallet?.address ?? null

  const umbra = useUmbraClient(wallet)

  // Umbra UTXOs
  const [utxos, setUtxos] = useState<ClaimableUtxo[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState<string | null>(null)

  // On-chain received
  const [received, setReceived] = useState<ReceivedReceipt[]>([])
  const [loadingReceived, setLoadingReceived] = useState(false)

  useEffect(() => {
    if (!address) return
    setLoadingReceived(true)
    fetch(`/api/receipts?walletAddress=${encodeURIComponent(address)}&tab=received`)
      .then((r) => r.json())
      .then((data) => setReceived(Array.isArray(data) ? data : []))
      .catch(() => setReceived([]))
      .finally(() => setLoadingReceived(false))
  }, [address])

  async function scanUtxos() {
    if (!umbra.isRegistered) return
    setScanning(true)
    setScanError(null)
    try {
      const found = await umbra.scanUtxos()
      setUtxos(found)
      if (found.length === 0) setScanError('No claimable UTXOs found.')
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  async function claimUtxo(utxo: ClaimableUtxo) {
    const key = String(utxo.insertionIndex)
    setClaiming(key)
    try {
      await umbra.claimUtxo(utxo)
      setUtxos((prev) => prev.filter((u) => u.insertionIndex !== utxo.insertionIndex))
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Claim failed')
    } finally {
      setClaiming(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-white" />
          <h1 className="text-xl font-semibold text-white">Claim</h1>
        </div>
        <p className="mt-1 text-sm text-[#888]">
          Scan for USDC payments sent to you via Umbra&apos;s stealth pool
        </p>
      </div>

      {!address && (
        <div className="rounded-xl border border-[#222] bg-[#111] px-6 py-10 text-center">
          <p className="text-sm text-[#888]">Connect your wallet to scan for claimable payments.</p>
        </div>
      )}

      {/* Umbra UTXO scan section */}
      {address && (
        <div className="rounded-xl border border-[#222] bg-[#111] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-white" />
              <p className="text-sm font-medium text-white">Umbra Stealth UTXOs</p>
            </div>
            {umbra.isRegistered && (
              <button
                onClick={scanUtxos}
                disabled={scanning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#222] text-xs text-[#888] hover:text-white hover:border-[#444] transition-colors disabled:opacity-40"
              >
                {scanning ? 'Scanning…' : 'Scan for UTXOs'}
              </button>
            )}
          </div>

          {!umbra.isRegistered && umbra.status === 'ready' && (
            <div className="flex items-center justify-between rounded-lg border border-[#222] bg-black px-4 py-3">
              <p className="text-xs text-[#888]">Register with Umbra to scan for stealth payments.</p>
              <button
                onClick={umbra.register}
                className="text-xs text-white underline hover:no-underline"
              >
                Register →
              </button>
            </div>
          )}

          {umbra.status === 'initializing' && (
            <p className="text-xs text-[#555]">Connecting to Umbra…</p>
          )}

          {scanError && (
            <p className="text-xs text-[#555]">{scanError}</p>
          )}

          {utxos.length > 0 ? (
            <div className="space-y-2">
              {utxos.map((utxo) => {
                const key = String(utxo.insertionIndex)
                const amountStr = (Number(utxo.amount) / 1_000_000).toFixed(2)
                return (
                  <div key={key} className="flex items-center justify-between rounded-lg border border-[#222] bg-black px-4 py-3">
                    <div>
                      <p className="text-sm text-white font-mono">{amountStr} USDC</p>
                      <p className="text-xs text-[#555] font-mono">Tree {utxo.treeIndex} · Leaf {utxo.insertionIndex}</p>
                    </div>
                    <button
                      onClick={() => claimUtxo(utxo)}
                      disabled={claiming === key}
                      className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-medium hover:bg-[#e0e0e0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {claiming === key ? 'Claiming…' : 'Claim →'}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            umbra.isRegistered && !scanning && !scanError && (
              <div className="rounded-lg border border-[#222] bg-black px-4 py-8 text-center">
                <p className="text-sm text-[#555]">No UTXOs found. Click &quot;Scan for UTXOs&quot; to check.</p>
              </div>
            )
          )}

          {umbra.isRegistered && (
            <p className="text-xs text-[#555]">
              Scan checks all Umbra Merkle trees for UTXOs locked to your wallet&apos;s viewing key.
              Claim withdraws them to your public USDC balance.
            </p>
          )}
        </div>
      )}

      {/* Received on-chain section */}
      {address && (
        <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
          <div className="px-6 py-3 border-b border-[#222]">
            <span className="text-xs text-[#888] uppercase tracking-wider font-medium">
              Received On-chain
            </span>
          </div>
          {loadingReceived ? (
            <div className="px-6 py-10 text-center text-sm text-[#888]">Loading…</div>
          ) : received.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[#555]">No on-chain payments received yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#222]">
                  {['From', 'Amount', 'Date', 'Receipt'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs text-[#888] uppercase tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {received.map((r) => (
                  <tr key={r.id} className="hover:bg-black/30">
                    <td className="px-6 py-4 font-mono text-white text-xs">
                      {truncateAddress(r.senderWallet)}
                    </td>
                    <td className="px-6 py-4 font-mono text-white text-xs">
                      {r.payment ? formatAmount(r.payment.amount, r.payment.currency) : '—'}
                    </td>
                    <td className="px-6 py-4 text-[#888] text-xs">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/receipt/${r.paymentId}`} className="text-xs text-[#888] hover:text-white underline font-mono">
                        view →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
