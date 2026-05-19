import nacl from 'tweetnacl'

/**
 * Verify an Ed25519 signature produced by a Solana wallet.
 *
 * @param message    - The exact UTF-8 message that was signed
 * @param signature  - The 64-byte signature as a hex string
 * @param publicKey  - The signer's public key as a base58 string
 * @returns true if the signature is valid for the message and public key
 */
export function verifyEd25519Signature(
  message: string,
  signatureHex: string,
  publicKeyBytes: Uint8Array,
): boolean {
  const messageBytes = new TextEncoder().encode(message)
  const signatureBytes = hexToUint8Array(signatureHex)

  if (signatureBytes.length !== 64) return false
  if (publicKeyBytes.length !== 32) return false

  return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
}

/**
 * Parse and validate the timestamp embedded in a PSR decrypt challenge message.
 *
 * Message format: "PSR:decrypt:<receiptHash>:<unix_ms_timestamp>"
 *
 * @param message   - The full challenge message
 * @param windowMs  - Allowed time window in milliseconds (default 5 minutes)
 * @returns The parsed receiptHash if valid, or null if expired/malformed
 */
export function parseDecryptChallenge(
  message: string,
  windowMs = 5 * 60 * 1000,
): { receiptHash: string } | null {
  const parts = message.split(':')
  if (parts.length !== 4) return null
  if (parts[0] !== 'PSR' || parts[1] !== 'decrypt') return null

  const receiptHash = parts[2]
  const timestamp = parseInt(parts[3], 10)

  if (!receiptHash || isNaN(timestamp)) return null

  const now = Date.now()
  if (Math.abs(now - timestamp) > windowMs) return null

  return { receiptHash }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

/**
 * Decode a base58-encoded string to Uint8Array.
 * Uses the Bitcoin/Solana alphabet.
 */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function base58Decode(str: string): Uint8Array {
  const bytes: number[] = [0]
  for (const char of str) {
    const idx = BASE58_ALPHABET.indexOf(char)
    if (idx === -1) throw new Error(`Invalid base58 character: ${char}`)
    let carry = idx
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58
      bytes[j] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }
  // Handle leading '1's (zeros in base58)
  for (const char of str) {
    if (char !== '1') break
    bytes.push(0)
  }
  return new Uint8Array(bytes.reverse())
}
