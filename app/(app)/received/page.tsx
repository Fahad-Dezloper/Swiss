'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useWallets } from '@privy-io/react-auth/solana'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { formatDate, truncateAddress } from '@/lib/utils'
import { useUmbraClient, type ClaimableUtxo } from '@/hooks/use-umbra-client'
import { ShieldCheck } from 'lucide-react'

interface ReceivedPayment {
  id: string
  type: string
  status: string
  amount: string
  currency: string
  txSignature: string | null
  recipientAddr: string
  createdAt: string
  payrollRun: { periodLabel: string } | null
  receiptId: string | null
  receiptHash: string | null
  verifierToken: string | null
}


function formatAmount(amount: string, currency: string): string {
  if (currency === 'SOL') return (Number(amount) / LAMPORTS_PER_SOL).toFixed(4) + ' SOL'
  return (Number(amount) / 1_000_000).toFixed(2) + ' ' + currency
}

export default function ReceivedPage() {
  const { wallets } = useWallets()
  const wallet = wallets[0] ?? null
  const address = wallet?.address ?? null

  const umbra = useUmbraClient(wallet)

  const [payments, setPayments] = useState<ReceivedPayment[]>([])
  const [loading, setLoading] = useState(true)

  // Umbra UTXOs
  const [utxos, setUtxos] = useState<ClaimableUtxo[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState<string | null>(null) // insertionIndex as key

  useEffect(() => {
    if (!address) { setLoading(false); return }
    fetch(`/api/payments/received?walletAddress=${encodeURIComponent(address)}`)
      .then((r) => r.json())
      .then((data) => setPayments(Array.isArray(data) ? data : []))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false))
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

  const totalReceived = payments.reduce((sum, p) => {
    if (p.currency === 'SOL') return sum + Number(p.amount) / LAMPORTS_PER_SOL
    return sum
  }, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Received Payments</h1>
        <p className="mt-1 text-sm text-[#888]">
          Payments sent to{' '}
          {address ? (
            <span className="font-mono text-white">{truncateAddress(address)}</span>
          ) : 'your wallet'}
        </p>
      </div>

      {!address && (
        <div className="rounded-xl border border-[#222] bg-[#111] px-6 py-10 text-center">
          <p className="text-sm text-[#888]">Connect your wallet to see payments received.</p>
        </div>
      )}

      {/* Umbra UTXO claim section */}
      {address && umbra.isRegistered && (
        <div className="rounded-xl border border-[#222] bg-[#111] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-white" />
              <p className="text-sm font-medium text-white">Umbra Stealth UTXOs</p>
            </div>
            <button
              onClick={scanUtxos}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#222] text-xs text-[#888] hover:text-white hover:border-[#444] transition-colors disabled:opacity-40"
            >
              {scanning ? 'Scanning…' : 'Scan for UTXOs'}
            </button>
          </div>

          {scanError && (
            <p className="text-xs text-[#555]">{scanError}</p>
          )}

          {utxos.length > 0 && (
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
                      className="px-3 py-1.5 rounded-lg bg-[#43AED6] text-white text-xs font-medium hover:bg-[#3a9dc3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {claiming === key ? 'Claiming…' : 'Claim →'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <p className="text-xs text-[#555]">
            Scan scans all Umbra Merkle trees for UTXOs locked to your wallet's viewing key.
            Claim withdraws them to your public USDC balance.
          </p>
        </div>
      )}

      {address && !loading && payments.length > 0 && (
        <div className="rounded-xl border border-[#222] bg-[#111] px-6 py-4">
          <p className="text-xs text-[#888]">Total received (SOL)</p>
          <p className="text-2xl font-semibold text-white font-mono mt-0.5">
            {totalReceived.toFixed(4)} SOL
          </p>
        </div>
      )}

      {address && (
        <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-[#888]">Loading…</div>
          ) : payments.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[#555]">No payments received yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#222]">
                  {['Period', 'Amount', 'Status', 'Date', 'Tx', 'Receipt', 'Proof'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {payments.map((pmt) => (
                  <tr key={pmt.id} className="hover:bg-black transition-colors">
                    <td className="px-4 py-3 text-white text-xs font-mono">{pmt.payrollRun?.periodLabel ?? '—'}</td>
                    <td className="px-4 py-3 text-white text-xs font-mono">{formatAmount(pmt.amount, pmt.currency)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded border border-[#333] text-xs text-[#888] font-mono uppercase">{pmt.status}</span>
                    </td>
                    <td className="px-4 py-3 text-[#888] text-xs">{formatDate(pmt.createdAt)}</td>
                    <td className="px-4 py-3">
                      {pmt.txSignature ? (
                        <a href={`https://explorer.solana.com/tx/${pmt.txSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#888] hover:text-white underline font-mono">explorer ↗</a>
                      ) : <span className="text-xs text-[#555]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {pmt.receiptId ? (
                        <Link href={`/receipt/${pmt.id}`} className="text-xs text-[#888] hover:text-white underline font-mono">view →</Link>
                      ) : <span className="text-xs text-[#555]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {pmt.verifierToken ? (
                        <a href={`/verify/${pmt.verifierToken}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#888] hover:text-white underline font-mono">verify →</a>
                      ) : <span className="text-xs text-[#555]">—</span>}
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
