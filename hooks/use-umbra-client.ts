'use client'

import { useState, useEffect, useRef } from 'react'
import { createUmbraSignerFromPrivy, type PrivySolanaWallet } from '@/lib/umbra/signer-adapter'

export type UmbraStatus = 'idle' | 'initializing' | 'registering' | 'ready' | 'error'
export type UmbraErrorKind = 'init' | 'registration' | null

export interface ClaimableUtxo {
  id: string
  amount: bigint
  mint: string
  treeIndex: number
  insertionIndex: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _raw: any
}

export interface UmbraClientHook {
  status: UmbraStatus
  error: string | null
  errorKind: UmbraErrorKind
  isRegistered: boolean
  register(): Promise<void>
  checkRecipientRegistered(address: string): Promise<boolean>
  sendUsdc(args: {
    recipientAddress: string
    amount: bigint
    onStep?(step: string): void
  }): Promise<{ txSignature: string }>
  scanUtxos(): Promise<ClaimableUtxo[]>
  claimUtxo(utxo: ClaimableUtxo): Promise<{ txSignature: string }>
}

function cacheKey(addr: string) { return `psr_umbra_registered_${addr}` }
function getCachedRegistered(addr: string): boolean {
  try { return localStorage.getItem(cacheKey(addr)) === '1' } catch { return false }
}
function setCachedRegistered(addr: string, value: boolean) {
  try { if (value) localStorage.setItem(cacheKey(addr), '1') } catch { /* noop */ }
}

function fakeSig(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  return Array.from({ length: 88 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const MOCK_REGISTERED = new Set<string>()
function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

export function useUmbraClient(wallet: PrivySolanaWallet | null): UmbraClientHook {
  const [status, setStatus] = useState<UmbraStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [errorKind, setErrorKind] = useState<UmbraErrorKind>(null)
  const [isRegistered, setIsRegistered] = useState(() =>
    wallet ? getCachedRegistered(wallet.address) : false
  )
  const signerRef = useRef<ReturnType<typeof createUmbraSignerFromPrivy> | null>(null)

  useEffect(() => {
    if (!wallet) {
      signerRef.current = null
      setStatus('idle')
      setIsRegistered(false)
      return
    }

    const cached = getCachedRegistered(wallet.address)
    setIsRegistered(cached)
    setStatus('initializing')
    setError(null)
    setErrorKind(null)

    let cancelled = false
    ;(async () => {
      await delay(800)
      if (cancelled) return
      signerRef.current = createUmbraSignerFromPrivy(wallet)
      const registered = cached || MOCK_REGISTERED.has(wallet.address)
      setIsRegistered(registered)
      if (registered) setCachedRegistered(wallet.address, true)
      setStatus('ready')
    })()

    return () => { cancelled = true }
  }, [wallet?.address])

  async function register() {
    if (!wallet || !signerRef.current) throw new Error('Wallet not connected')
    setStatus('registering')
    setError(null)
    setErrorKind(null)
    try {
      const msgBytes = new TextEncoder().encode(
        `PSR × Umbra — Register stealth account\n\nWallet: ${wallet.address}\nTimestamp: ${Date.now()}`
      )
      await signerRef.current.signMessage(msgBytes)
      await delay(1400)
      MOCK_REGISTERED.add(wallet.address)
      setCachedRegistered(wallet.address, true)
      setIsRegistered(true)
      setStatus('ready')
    } catch (err) {
      setStatus('ready')
      setError(err instanceof Error ? err.message : 'Registration failed')
      setErrorKind('registration')
      throw err
    }
  }

  async function checkRecipientRegistered(address: string): Promise<boolean> {
    await delay(350)
    return MOCK_REGISTERED.has(address) || getCachedRegistered(address)
  }

  async function sendUsdc({ recipientAddress, amount, onStep }: {
    recipientAddress: string
    amount: bigint
    onStep?(step: string): void
  }): Promise<{ txSignature: string }> {
    if (!wallet || !signerRef.current) throw new Error('Wallet not connected')
    if (!isRegistered) throw new Error('Register with Umbra first')

    onStep?.('Approve the transaction in your wallet…')
    const msgBytes = new TextEncoder().encode(
      `PSR × Umbra — Send ${Number(amount) / 1_000_000} USDC\n\nTo: ${recipientAddress}\nTimestamp: ${Date.now()}`
    )
    await signerRef.current.signMessage(msgBytes)

    onStep?.('Generating ZK proof…')
    await delay(1800)

    onStep?.('Broadcasting transaction…')
    await delay(600)

    return { txSignature: fakeSig() }
  }

  async function scanUtxos(): Promise<ClaimableUtxo[]> {
    if (!isRegistered) throw new Error('Register with Umbra first')
    await delay(1400)
    const count = Math.random() < 0.4 ? Math.floor(Math.random() * 2) + 1 : 0
    return Array.from({ length: count }, (_, i) => ({
      id: `mock-${i}`,
      amount: BigInt(Math.floor(Math.random() * 50 + 5) * 1_000_000),
      mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      treeIndex: 0,
      insertionIndex: i,
      _raw: null,
    }))
  }

  async function claimUtxo(_utxo: ClaimableUtxo): Promise<{ txSignature: string }> {
    if (!wallet || !signerRef.current) throw new Error('Wallet not connected')
    const msgBytes = new TextEncoder().encode(
      `PSR × Umbra — Claim ${Number(_utxo.amount) / 1_000_000} USDC\n\nTimestamp: ${Date.now()}`
    )
    await signerRef.current.signMessage(msgBytes)
    await delay(1200)
    return { txSignature: fakeSig() }
  }

  return { status, error, errorKind, isRegistered, register, checkRecipientRegistered, sendUsdc, scanUtxos, claimUtxo }
}
