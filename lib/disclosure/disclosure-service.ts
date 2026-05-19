import crypto from 'node:crypto'
import { db } from '@/lib/db'
import type { DisclosureEvent } from '@/app/generated/prisma/client'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DISCLOSABLE_FIELDS = [
  'invoice_ref',
  'payment_period',
  'timestamp',
  'settlement_status',
  'amount',
  'currency',
  'rail',
] as const

export type DisclosableField = (typeof DISCLOSABLE_FIELDS)[number]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VerifierPackage {
  fields: Record<string, unknown>
  proofState: string
  verifiedAt: string
  packageHash: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex')
}

function buildPackageHash(
  fields: Record<string, unknown>,
  proofState: string,
  receiptId: string,
  timestamp: string,
): string {
  return sha256Hex(JSON.stringify({ fields, proofState, receiptId, timestamp }))
}

const DISCLOSURE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateDisclosure(
  receiptId: string,
  disclosedById: string,
  fields: string[],
  disclosedToEmail?: string,
): Promise<DisclosureEvent> {
  // Validate requested fields
  const invalid = fields.filter((f) => !(DISCLOSABLE_FIELDS as readonly string[]).includes(f))
  if (invalid.length > 0) throw new Error(`Non-disclosable fields: ${invalid.join(', ')}`)

  const receipt = await db.receipt.findUniqueOrThrow({
    where: { id: receiptId },
    include: { payment: { include: { invoice: true } } },
  })

  // Build disclosed field values from the payment record (public metadata only)
  const { payment } = receipt
  const fieldMap: Record<string, unknown> = {
    invoice_ref: payment.invoice?.invoiceRef ?? payment.invoiceId ?? null,
    payment_period: payment.payrollRunId ?? null,
    timestamp: payment.createdAt.toISOString(),
    settlement_status: payment.status,
    amount: payment.amount.toString(),
    currency: payment.currency,
    rail: payment.rail,
  }

  const disclosed: Record<string, unknown> = Object.fromEntries(
    fields.map((f) => [f, fieldMap[f] ?? null]),
  )

  // Resolve disclosedToId if email provided
  let disclosedToId: string | undefined
  if (disclosedToEmail) {
    const toUser = await db.user.findUnique({ where: { email: disclosedToEmail } })
    disclosedToId = toUser?.id
  }

  const proofEvent = await db.proofEvent.findFirst({
    where: { paymentId: payment.id },
    orderBy: { createdAt: 'desc' },
  })

  const proofState = proofEvent?.proofType ?? 'NONE'
  const timestamp = new Date().toISOString()
  const packageHash = buildPackageHash(disclosed, proofState, receiptId, timestamp)

  return db.disclosureEvent.create({
    data: {
      receiptId,
      disclosedById,
      disclosedToId: disclosedToId ?? null,
      disclosedToEmail: disclosedToEmail ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fieldsJson: disclosed as any,
      packageHash,
      verifierToken: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + DISCLOSURE_TTL_MS),
    },
  })
}

// ---------------------------------------------------------------------------
// Namespace object (consumed by pre-existing API routes)
// ---------------------------------------------------------------------------

interface DiscloseArgs {
  receipt: { id: string }
  disclosedById: string
  fields: string[]
  disclosedToEmail?: string
}

async function disclose(
  args: DiscloseArgs,
): Promise<{ verifierToken: string; disclosureEvent: DisclosureEvent }> {
  const event = await generateDisclosure(
    args.receipt.id,
    args.disclosedById,
    args.fields,
    args.disclosedToEmail,
  )
  return { verifierToken: event.verifierToken, disclosureEvent: event }
}

export async function verifyDisclosure(verifierToken: string): Promise<VerifierPackage | null> {
  const event = await db.disclosureEvent.findUnique({
    where: { verifierToken },
    include: {
      receipt: { include: { payment: true } },
    },
  })

  if (!event) return null
  if (event.expiresAt && event.expiresAt < new Date()) return null

  const proofEvent = await db.proofEvent.findFirst({
    where: { paymentId: event.receipt.paymentId },
    orderBy: { createdAt: 'desc' },
  })

  const proofState = proofEvent?.proofType ?? 'NONE'
  const verifiedAt = new Date().toISOString()

  return {
    fields: event.fieldsJson as Record<string, unknown>,
    proofState,
    verifiedAt,
    packageHash: event.packageHash,
  }
}

export const disclosureService = {
  disclose,
  generateDisclosure,
  verifyDisclosure,
}
