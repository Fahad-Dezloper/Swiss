/**
 * Umbra payment intent metadata — built server-side, executed client-side.
 * ZK proving and wallet signing happen in the browser; the server only tracks state.
 */

export type UmbraNetwork = 'mainnet-beta' | 'devnet'

/** Minimal config needed to initialise an Umbra client (no zkProver). */
export interface UmbraClientConfig {
  network: UmbraNetwork
  rpcUrl: string
  rpcSubscriptionsUrl: string
  indexerApiEndpoint: string
}

/**
 * Intent created server-side before the client submits the transaction.
 * Passed to the client so it can build + sign the Umbra UTXO instruction.
 */
export interface PaymentIntent {
  paymentId: string
  destinationAddress: string
  mint: string
  amount: bigint
  /** Unix ms — intent expires if tx isn't submitted within this window */
  expiresAt: number
}

/**
 * On-chain metadata returned by the client after the UTXO is created.
 * Stored server-side to anchor receipts and proofs.
 */
export interface RailTxMeta {
  txSignature: string
  /** Merkle tree index where the UTXO commitment was inserted */
  treeIndex: number
  /** Leaf index within that tree */
  insertionIndex: number
  /** Unix ms of on-chain confirmation */
  confirmedAt: number
}

/** Lifecycle of a single UTXO on the Umbra rail. */
export type UtxoState =
  | 'intent'     // server recorded intent, tx not yet submitted
  | 'pending'    // tx submitted, not yet confirmed
  | 'delivered'  // UTXO commitment inserted in Merkle tree (tx confirmed)
  | 'claimed'    // recipient submitted ZK nullifier proof
  | 'failed'     // tx failed or expired

export interface UtxoMeta {
  paymentId: string
  state: UtxoState
  txSignature?: string
  treeIndex?: number
  insertionIndex?: number
  deliveredAt?: number
  claimedAt?: number
  claimTxSignature?: string
}
