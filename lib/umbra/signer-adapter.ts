/**
 * Adapts a Privy ConnectedStandardSolanaWallet to IUmbraSigner.
 *
 * Umbra SDK uses @solana/kit transaction format. We use kit's encoder/decoder
 * to convert between that format and the Solana wire format Privy accepts.
 */
import { getTransactionEncoder, getTransactionDecoder } from '@solana/kit'
import type { IUmbraSigner } from '@umbra-privacy/sdk/interfaces'

// Privy's ConnectedStandardSolanaWallet shape
export interface PrivySolanaWallet {
  address: string
  signMessage(args: { message: Uint8Array }): Promise<{ signature: Uint8Array }>
  signTransaction(args: { transaction: Uint8Array }): Promise<{ signedTransaction: Uint8Array }>
}

export function createUmbraSignerFromPrivy(wallet: PrivySolanaWallet): IUmbraSigner {
  const encoder = getTransactionEncoder()
  const decoder = getTransactionDecoder()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const address = wallet.address as any

  return {
    address,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signTransaction(transaction: any) {
      const wireBytes = encoder.encode(transaction)
      const { signedTransaction } = await wallet.signTransaction({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transaction: wireBytes as any,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decoded = decoder.decode(signedTransaction as any)
      return {
        ...transaction,
        signatures: { ...transaction.signatures, ...decoded.signatures },
      }
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signTransactions(transactions: readonly any[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Promise.all(transactions.map((tx: any) => (this as any).signTransaction(tx)))
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signMessage(message: any) {
      const { signature } = await wallet.signMessage({ message })
      return {
        message,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signature: signature as any,
        signer: address,
      }
    },
  }
}
