import crypto from 'node:crypto'
import { db } from '@/lib/db'
import type { Payment, Receipt } from '@/app/generated/prisma/client'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex')
}

/**
 * Build a receipt hash from the real on-chain tx signature + payment metadata.
 * This is a fingerprint, NOT encryption — just a canonical identifier.
 */
function buildReceiptHash(
  paymentId: string,
  txSignature: string,
  amount: bigint,
  timestamp: Date,
): string {
  const canonical = [paymentId, txSignature, amount.toString(), timestamp.toISOString()].join('|')
  return sha256Hex(canonical)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a receipt from a confirmed on-chain payment.
 * No encryption — the receipt is just a record linking the real tx to payment metadata.
 */
export async function createReceipt(
  payment: Payment,
  senderWallet: string,
): Promise<Receipt> {
  const receiptHash = buildReceiptHash(
    payment.id,
    payment.txSignature ?? '',
    payment.amount,
    payment.updatedAt,
  )

  return db.receipt.create({
    data: {
      paymentId: payment.id,
      receiptHash,
      senderWallet,
      recipientWallet: payment.recipientAddr,
      // No encryptedBlob — the tx is real and verifiable on-chain
    },
  })
}

export async function getReceipt(paymentId: string): Promise<Receipt | null> {
  return db.receipt.findUnique({ where: { paymentId } })
}

/**
 * Get full payment details for a receipt, gated by wallet authorization.
 * Only the sender or recipient wallet can view the linked payment metadata.
 */
export async function getReceiptDetails(
  paymentId: string,
  walletAddress: string,
): Promise<{
  receipt: {
    id: string
    paymentId: string
    receiptHash: string
    senderWallet: string
    recipientWallet: string
    createdAt: string
  }
  payment: {
    id: string
    type: string
    status: string
    txSignature: string | null
    amount: string
    currency: string
    recipientAddr: string
    rail: string
    createdAt: string
    payrollRunId: string | null
  }
} | null> {
  const receipt = await db.receipt.findUnique({
    where: { paymentId },
    include: {
      payment: {
        include: {
          payrollRun: { select: { periodLabel: true } },
        },
      },
    },
  })

  if (!receipt) return null

  // Authorization: only sender or recipient
  const isAuthorized =
    receipt.senderWallet === walletAddress ||
    receipt.recipientWallet === walletAddress

  if (!isAuthorized) return null

  return {
    receipt: {
      id: receipt.id,
      paymentId: receipt.paymentId,
      receiptHash: receipt.receiptHash,
      senderWallet: receipt.senderWallet,
      recipientWallet: receipt.recipientWallet,
      createdAt: receipt.createdAt.toISOString(),
    },
    payment: {
      id: receipt.payment.id,
      type: receipt.payment.type,
      status: receipt.payment.status,
      txSignature: receipt.payment.txSignature,
      amount: receipt.payment.amount.toString(),
      currency: receipt.payment.currency,
      recipientAddr: receipt.payment.recipientAddr,
      rail: receipt.payment.rail,
      createdAt: receipt.payment.createdAt.toISOString(),
      payrollRunId: receipt.payment.payrollRunId,
    },
  }
}

// ---------------------------------------------------------------------------
// Namespace object (consumed by API routes)
// ---------------------------------------------------------------------------

export const receiptService = {
  createReceipt,
  getReceipt,
  getReceiptDetails,
}
