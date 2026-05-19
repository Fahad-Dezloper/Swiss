import crypto from 'node:crypto'
import { db } from '@/lib/db'
import type { ProofEvent } from '@/app/generated/prisma/client'
import { ProofType } from '@/app/generated/prisma/client'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex')
}

function buildVerifierPackageHash(packageJson: object): string {
  return sha256Hex(JSON.stringify(packageJson))
}

function makeVerifierPackage(
  paymentId: string,
  proofType: ProofType,
  extra: Record<string, unknown> = {},
): { pkg: object; hash: string } {
  const pkg = {
    paymentId,
    proofType,
    generatedAt: new Date().toISOString(),
    ...extra,
  }
  return { pkg, hash: buildVerifierPackageHash(pkg) }
}

const PROOF_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record that a payment's UTXO was delivered (inserted in Merkle tree).
 */
export async function generateDeliveredProof(
  paymentId: string,
  userId: string,
): Promise<ProofEvent> {
  const payment = await db.payment.findUniqueOrThrow({
    where: { id: paymentId },
    select: { txSignature: true, status: true },
  })

  const { pkg, hash } = makeVerifierPackage(paymentId, ProofType.DELIVERED, {
    txSignature: payment.txSignature,
    status: payment.status,
  })

  return db.proofEvent.create({
    data: {
      paymentId,
      proofType: ProofType.DELIVERED,
      generatedById: userId,
      verifierToken: crypto.randomUUID(),
      verifierPackageHash: hash,
      expiresAt: new Date(Date.now() + PROOF_TTL_MS),
    },
  })
}

/**
 * Record that the recipient claimed a UTXO (submitted ZK nullifier proof).
 */
export async function generateClaimedProof(
  paymentId: string,
  userId: string,
  claimTxSig: string,
): Promise<ProofEvent> {
  const { pkg, hash } = makeVerifierPackage(paymentId, ProofType.CLAIMED, {
    claimTxSignature: claimTxSig,
  })

  return db.proofEvent.create({
    data: {
      paymentId,
      proofType: ProofType.CLAIMED,
      generatedById: userId,
      verifierToken: crypto.randomUUID(),
      verifierPackageHash: hash,
      expiresAt: new Date(Date.now() + PROOF_TTL_MS),
    },
  })
}

export async function getProofByToken(verifierToken: string): Promise<ProofEvent | null> {
  return db.proofEvent.findUnique({ where: { verifierToken } })
}

// ---------------------------------------------------------------------------
// Namespace object (consumed by pre-existing API routes)
// ---------------------------------------------------------------------------

interface GenerateProofArgs {
  paymentId: string
  proofType: 'DELIVERED' | 'CLAIMED' | 'ACKNOWLEDGED'
  generatedById: string
  claimTxSignature?: string
}

async function generateProof(args: GenerateProofArgs): Promise<ProofEvent> {
  if (args.proofType === 'CLAIMED') {
    return generateClaimedProof(args.paymentId, args.generatedById, args.claimTxSignature ?? '')
  }
  return generateDeliveredProof(args.paymentId, args.generatedById)
}

export const proofService = {
  generateProof,
  generateDeliveredProof,
  generateClaimedProof,
  getProofByToken,
}
