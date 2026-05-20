'use client'

import { useState, useEffect, useRef } from 'react'
import {
  getUmbraClient,
  getATAIntoStealthPoolNoteCreatorProver,
  getUserRegistrationProver,
} from '@umbra-privacy/sdk'
import { getUserRegistrationFunction } from '@umbra-privacy/sdk/registration'
import { getUserAccountQuerierFunction } from '@umbra-privacy/sdk/query'
import { getATAIntoReceiverBurnableStealthPoolNoteCreatorFunction } from '@umbra-privacy/sdk/deposit'
import { getBurnableStealthPoolNoteScannerFunction } from '@umbra-privacy/sdk/burn'
import { createUmbraSignerFromPrivy, type PrivySolanaWallet } from '@/lib/umbra/signer-adapter'

const NETWORK = 'devnet' as const
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const RPC_WS = 'wss://api.devnet.solana.com'
const INDEXER = 'https://utxo-indexer.api.umbraprivacy.com'
const USDC_MINT = (process.env.NEXT_PUBLIC_UMBRA_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU') as `${string}`

export type UmbraStatus = 'idle' | 'initializing' | 'registering' | 'ready' | 'error'

export interface StealthPoolNote {
  id: string
  amount: bigint
  mint: string
  treeIndex: number
  insertionIndex: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _raw: any
}

// Keep ClaimableUtxo as an alias for backward compatibility with existing UI code
export type ClaimableUtxo = StealthPoolNote

export interface UmbraClientHook {
  status: UmbraStatus
  error: string | null
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UmbraClient = any

// Per-wallet localStorage cache so returning users don't hit the registration gate on every load
function cacheKey(addr: string) { return `psr_umbra_registered_${addr}` }
function getCachedRegistered(addr: string): boolean {
  try { return localStorage.getItem(cacheKey(addr)) === '1' } catch { return false }
}
function setCachedRegistered(addr: string, value: boolean) {
  try { if (value) localStorage.setItem(cacheKey(addr), '1') } catch { /* noop */ }
}

export function useUmbraClient(wallet: PrivySolanaWallet | null): UmbraClientHook {
  const [status, setStatus] = useState<UmbraStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  // Seed from localStorage immediately so returning users skip the registration gate
  const [isRegistered, setIsRegistered] = useState(() =>
    wallet ? getCachedRegistered(wallet.address) : false
  )
  const clientRef = useRef<UmbraClient>(null)

  useEffect(() => {
    if (!wallet) {
      clientRef.current = null
      setStatus('idle')
      setIsRegistered(false)
      return
    }

    // Optimistic: seed from cache so UmbraGate doesn't flash for returning users
    const cached = getCachedRegistered(wallet.address)
    setIsRegistered(cached)

    let cancelled = false
    setStatus('initializing')
    setError(null)

    ;(async () => {
      // Retry once — devnet RPC often fails transiently
      let lastErr: unknown = null
      for (let attempt = 0; attempt < 2; attempt++) {
        if (cancelled) return
        if (attempt > 0) await new Promise((r) => setTimeout(r, 2000))
        try {
          const signer = createUmbraSignerFromPrivy(wallet)
          const client = await getUmbraClient({
            signer,
            network: NETWORK,
            rpcUrl: RPC_URL,
            rpcSubscriptionsUrl: RPC_WS,
            indexerApiEndpoint: INDEXER,
            deferMasterSeedSignature: true,
          })
          if (cancelled) return
          clientRef.current = client

          const query = getUserAccountQuerierFunction({ client })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const account = await (query as any)(wallet.address).catch(() => null)
          if (cancelled) return
          // account.state === 'exists' = registered; fall back for older account shapes
          const registered = account?.state === 'exists' || (account !== null && account?.state === undefined)
          setIsRegistered(registered)
          setCachedRegistered(wallet.address, registered)
          setStatus('ready')
          return // success — exit retry loop
        } catch (err) {
          lastErr = err
        }
      }
      if (!cancelled) {
        setError(lastErr instanceof Error ? lastErr.message : 'Umbra init failed')
        setStatus('error')
        // Keep cached isRegistered — registered users can still use the app
      }
    })()

    return () => { cancelled = true }
  }, [wallet?.address])

  async function register() {
    const client = clientRef.current
    if (!client) throw new Error('Umbra client not initialized')
    setStatus('registering')
    try {
      const assetProvider = getCdnZkAssetProvider()
      const zkProver = getUserRegistrationProver({ assetProvider })
      const doRegister = getUserRegistrationFunction({ client }, { zkProver })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (doRegister as any)({ confidential: true, anonymous: true })
      setIsRegistered(true)
      if (wallet) setCachedRegistered(wallet.address, true)
      setStatus('ready')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Registration failed')
      throw err
    }
  }

  async function checkRecipientRegistered(address: string): Promise<boolean> {
    const client = clientRef.current
    if (!client) return false
    try {
      const query = getUserAccountQuerierFunction({ client })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await (query as any)(address).catch(() => null)
      return account?.state === 'exists'
    } catch {
      return false
    }
  }

  async function sendUsdc({ recipientAddress, amount, onStep }: {
    recipientAddress: string
    amount: bigint
    onStep?(step: string): void
  }): Promise<{ txSignature: string }> {
    const client = clientRef.current
    if (!client) throw new Error('Umbra client not initialized')
    if (!isRegistered) throw new Error('Register with Umbra first')

    onStep?.('Preparing ZK prover…')
    const assetProvider = getCdnZkAssetProvider()
    const zkProver = getATAIntoStealthPoolNoteCreatorProver({ assetProvider })

    const createNote = getATAIntoReceiverBurnableStealthPoolNoteCreatorFunction(
      { client },
      { zkProver },
    )

    onStep?.('Generating ZK proof (30–60s)…')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (createNote as any)({
      amount,
      destinationAddress: recipientAddress,
      mint: USDC_MINT,
    })

    const txSignature: string = Array.isArray(result) ? result[0] : result?.txSignature ?? result
    return { txSignature }
  }

  async function scanUtxos(): Promise<ClaimableUtxo[]> {
    const client = clientRef.current
    if (!client) throw new Error('Umbra client not initialized')
    if (!isRegistered) throw new Error('Register with Umbra first')

    const scan = getBurnableStealthPoolNoteScannerFunction({ client })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await (scan as any)()
    // v5 returns { receiver: [...], ephemeral: [...] } or a flat array
    const notes: unknown[] = Array.isArray(raw) ? raw : [
      ...(raw?.receiver ?? []),
      ...(raw?.ephemeral ?? []),
    ]

    return notes.map((r: unknown, i: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const note = r as any
      return {
        id: `note-${i}`,
        amount: note.amount ?? note.decryptedData?.amount ?? BigInt(0),
        mint: note.mint ?? USDC_MINT,
        treeIndex: note.treeIndex ?? 0,
        insertionIndex: note.insertionIndex ?? i,
        _raw: note,
      }
    })
  }

  async function claimUtxo(_utxo: ClaimableUtxo): Promise<{ txSignature: string }> {
    // Full claim requires an Umbra relayer endpoint + ZK proof generation.
    // Wire in getReceiverBurnableStealthPoolNoteIntoETABurnerFunction once a devnet relayer is available.
    throw new Error('Claim requires Umbra relayer — not yet configured for devnet')
  }

  return { status, error, isRegistered, register, checkRecipientRegistered, sendUsdc, scanUtxos, claimUtxo }
}
