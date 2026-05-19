import crypto from 'node:crypto'
import { db } from '@/lib/db'
import type { Payment, Receipt } from '@/app/generated/prisma/client'
import type { RailTxMeta } from '@/lib/umbra/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEncryptionKey(): Buffer {
  const raw = process.env.RECEIPT_ENCRYPTION_KEY
  if (!raw) throw new Error('Missing env: RECEIPT_ENCRYPTION_KEY')
  const key = Buffer.from(raw, 'hex')
  if (key.byteLength !== 32) throw new Error('RECEIPT_ENCRYPTION_KEY must be 32 bytes (64 hex chars)')
  return key
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex')
}

function aesGcmEncrypt(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(12) // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Encode as iv:authTag:ciphertext — all hex
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a receipt hash from canonical fields.
 * paymentId + txSignature + amount (string) + timestamp (ISO)
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

export async function createReceipt(payment: Payment, railTxMeta: RailTxMeta): Promise<Receipt> {
  const timestamp = new Date(railTxMeta.confirmedAt)

  const receiptHash = buildReceiptHash(
    payment.id,
    railTxMeta.txSignature,
    payment.amount,
    timestamp,
  )

  const fullFields = {
    paymentId: payment.id,
    txSignature: railTxMeta.txSignature,
    treeIndex: railTxMeta.treeIndex,
    insertionIndex: railTxMeta.insertionIndex,
    amount: payment.amount.toString(),
    currency: payment.currency,
    rail: payment.rail,
    senderUserId: payment.senderUserId,
    recipientAddr: payment.recipientAddr,
    invoiceId: payment.invoiceId ?? null,
    payrollRunId: payment.payrollRunId ?? null,
    type: payment.type,
    confirmedAt: timestamp.toISOString(),
    receiptHash,
  }

  const key = getEncryptionKey()
  const encryptedBlob = aesGcmEncrypt(JSON.stringify(fullFields), key)

  return db.receipt.create({
    data: {
      paymentId: payment.id,
      encryptedBlob,
      receiptHash,
    },
  })
}

export async function getReceipt(paymentId: string): Promise<Receipt | null> {
  return db.receipt.findUnique({ where: { paymentId } })
}

// ---------------------------------------------------------------------------
// Namespace object (consumed by pre-existing API routes)
// ---------------------------------------------------------------------------

/**
 * Route-friendly wrapper: derives RailTxMeta from Payment fields already
 * persisted on the record (txSignature + updatedAt).
 */
async function createReceiptFromPayment(payment: Payment): Promise<Receipt> {
  if (!payment.txSignature) throw new Error(`Payment ${payment.id} has no txSignature`)
  const meta: RailTxMeta = {
    txSignature: payment.txSignature,
    treeIndex: 0,
    insertionIndex: 0,
    confirmedAt: payment.updatedAt.getTime(),
  }
  return createReceipt(payment, meta)
}

export const receiptService = {
  createReceipt: createReceiptFromPayment,
  getReceipt,
}
