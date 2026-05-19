/**
 * Server-side Umbra adapter.
 *
 * ZK proving is WASM/browser-only (@umbra-privacy/web-zk-prover is NOT
 * installed server-side). This module never imports zkProver; it only:
 *   1. Builds PaymentIntents that the client can execute.
 *   2. Records RailTxMeta after the client confirms a transaction.
 *   3. Exposes the UmbraClientConfig for the browser to initialise its own client.
 */

import { db } from '@/lib/db'
import { PaymentStatus } from '@/app/generated/prisma/client'
import type { PaymentIntent, RailTxMeta, UmbraClientConfig } from './types'

/** Build the config object the browser needs to call getUmbraClient(). */
export function getUmbraClientConfig(): UmbraClientConfig {
  const { UMBRA_NETWORK, SOLANA_RPC_URL, SOLANA_RPC_WS_URL, UMBRA_INDEXER_API } = process.env

  if (!SOLANA_RPC_URL) throw new Error('Missing env: SOLANA_RPC_URL')
  if (!SOLANA_RPC_WS_URL) throw new Error('Missing env: SOLANA_RPC_WS_URL')
  if (!UMBRA_INDEXER_API) throw new Error('Missing env: UMBRA_INDEXER_API')

  return {
    network: (UMBRA_NETWORK ?? 'devnet') as UmbraClientConfig['network'],
    rpcUrl: SOLANA_RPC_URL,
    rpcSubscriptionsUrl: SOLANA_RPC_WS_URL,
    indexerApiEndpoint: UMBRA_INDEXER_API,
  }
}

/**
 * Build a PaymentIntent from an existing Payment row.
 * The client uses this to construct and sign the Umbra UTXO instruction.
 */
export async function buildPaymentIntent(paymentId: string): Promise<PaymentIntent> {
  const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId } })

  const UMBRA_USDC_MINT =
    process.env.UMBRA_USDC_MINT ?? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

  const TTL_MS = 15 * 60 * 1000 // 15 minutes

  return {
    paymentId: payment.id,
    destinationAddress: payment.recipientAddr,
    mint: UMBRA_USDC_MINT,
    amount: payment.amount,
    expiresAt: Date.now() + TTL_MS,
  }
}

/**
 * Record the result of a client-side UTXO creation.
 * Marks the Payment as DELIVERED and persists the rail metadata.
 */
export async function recordUtxoDelivered(
  paymentId: string,
  meta: RailTxMeta,
): Promise<void> {
  await db.payment.update({
    where: { id: paymentId },
    data: {
      txSignature: meta.txSignature,
      status: PaymentStatus.DELIVERED,
      updatedAt: new Date(meta.confirmedAt),
    },
  })
}

/**
 * Record that the recipient claimed a UTXO.
 * Marks the Payment as CLAIMED.
 */
export async function recordUtxoClaimed(
  paymentId: string,
  claimTxSignature: string,
): Promise<void> {
  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.CLAIMED,
      updatedAt: new Date(),
    },
  })
  // claimTxSignature stored in the proof event created by proof-service
  void claimTxSignature
}
