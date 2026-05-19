import { db } from '@/lib/db'
import { receiptService } from '@/lib/receipt/receipt-service'
import { verifyEd25519Signature, parseDecryptChallenge, base58Decode } from '@/lib/crypto/verify-signature'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params
    const body = await request.json()
    const { message, signature, walletAddress } = body

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'message is required' }, { status: 400 })
    }
    if (!signature || typeof signature !== 'string') {
      return Response.json({ error: 'signature is required' }, { status: 400 })
    }
    if (!walletAddress || typeof walletAddress !== 'string') {
      return Response.json({ error: 'walletAddress is required' }, { status: 400 })
    }

    // 1. Verify Ed25519 signature
    let publicKeyBytes: Uint8Array
    try {
      publicKeyBytes = base58Decode(walletAddress)
    } catch {
      return Response.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    const isValid = verifyEd25519Signature(message, signature, publicKeyBytes)
    if (!isValid) {
      return Response.json({ error: 'Invalid signature' }, { status: 403 })
    }

    // 2. Validate challenge timestamp
    const challenge = parseDecryptChallenge(message)
    if (!challenge) {
      return Response.json(
        { error: 'Invalid or expired challenge. Sign a fresh message and try again.' },
        { status: 403 },
      )
    }

    // 3. Verify receipt hash matches
    const receipt = await db.receipt.findUnique({ where: { paymentId } })
    if (!receipt) {
      return Response.json({ error: 'Receipt not found' }, { status: 404 })
    }

    if (challenge.receiptHash !== receipt.receiptHash) {
      return Response.json({ error: 'Challenge receipt hash mismatch' }, { status: 403 })
    }

    // 4. Get payment details (authorization checked internally)
    const result = await receiptService.getReceiptDetails(paymentId, walletAddress)
    if (!result) {
      return Response.json(
        { error: 'Access denied. Only the sender or recipient can view this receipt.' },
        { status: 403 },
      )
    }

    return Response.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
