'use client'

import { useState, useEffect, useRef } from 'react'
import {
  getUmbraClient,
  getUserRegistrationFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getUserAccountQuerierFunction,
  getClaimableUtxoScannerFunction,
} from '@umbra-privacy/sdk'
import {
  getCreateReceiverClaimableUtxoFromPublicBalanceProver,
  getCdnZkAssetProvider,
} from '@umbra-privacy/web-zk-prover'
import { createUmbraSignerFromPrivy, type PrivySolanaWallet } from '@/lib/umbra/signer-adapter'

const NETWORK = 'devnet' as const
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const RPC_WS = 'wss://api.devnet.solana.com'
const INDEXER = 'https://utxo-indexer.api.umbraprivacy.com'
const USDC_MINT = (process.env.NEXT_PUBLIC_UMBRA_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU') as `${string}`

export type UmbraStatus = 'idle' | 'initializing' | 'registering' | 'ready' | 'error'

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
  isRegistered: boolean
  register(): Promise<void>
  checkRecipientRegistered(address: string): Promise<boolean>
  sendUsdc(args: {
    recipientAddress: string
    amount: bigint
    onStep?(step: string): void
  }): Promise<{ txSignature: string }>
  scanUtxos(): Promise<ClaimableUtxo[]>
  claimUtxo(utxo: ClaimableUtxo): Promise<{ txSignature: string }>  // requires relayer — stub for now
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UmbraClient = any

export function useUmbraClient(wallet: PrivySolanaWallet | null): UmbraClientHook {
  const [status, setStatus] = useState<UmbraStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const clientRef = useRef<UmbraClient>(null)

  useEffect(() => {
    if (!wallet) {
      clientRef.current = null
      setStatus('idle')
      setIsRegistered(false)
      return
    }

    let cancelled = false
    setStatus('initializing')
    setError(null)

    ;(async () => {
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
        setIsRegistered(account !== null)
        setStatus('ready')
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Umbra init failed')
          setStatus('error')
        }
      }
    })()

    return () => { cancelled = true }
  }, [wallet?.address])

  async function register() {
    const client = clientRef.current
    if (!client) throw new Error('Umbra client not initialized')
    setStatus('registering')
    try {
      const doRegister = getUserRegistrationFunction({ client })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (doRegister as any)({ confidential: true, anonymous: true })
      setIsRegistered(true)
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
      return account !== null
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
    const zkAssetProvider = getCdnZkAssetProvider()
    const zkProver = getCreateReceiverClaimableUtxoFromPublicBalanceProver({
      assetProvider: zkAssetProvider,
    })

    const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
      { client },
      { zkProver },
    )

    onStep?.('Generating ZK proof (30–60s)…')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (createUtxo as any)({
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

    const scan = getClaimableUtxoScannerFunction({ client })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = await (scan as any)()

    return results.map((r, i) => ({
      id: `utxo-${i}`,
      amount: r.amount ?? r.decryptedData?.amount ?? BigInt(0),
      mint: r.mint ?? USDC_MINT,
      treeIndex: r.treeIndex ?? 0,
      insertionIndex: r.insertionIndex ?? i,
      _raw: r,
    }))
  }

  async function claimUtxo(_utxo: ClaimableUtxo): Promise<{ txSignature: string }> {
    // Full claim requires an Umbra relayer endpoint + ZK proof generation.
    // The relayer URL (`UMBRA_RELAYER_API`) is not yet configured for devnet.
    // Once Umbra provides a devnet relayer URL, wire in:
    //   getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction({ client }, { relayer, fetchBatchMerkleProof, zkProver })
    throw new Error('Claim requires Umbra relayer — not yet configured for devnet')
  }

  return { status, error, isRegistered, register, checkRecipientRegistered, sendUsdc, scanUtxos, claimUtxo }
}
